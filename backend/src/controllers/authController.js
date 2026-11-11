const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { wrap, fail } = require('../lib/http');
const { verifyGoogleIdToken } = require('../services/google');
const { normalizeUsername, usernameError, suggestUsername } = require('../lib/username');

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  avatarUrl: user.avatarUrl,
});
const respond = (res, user, { created = false } = {}) =>
  res.json({
    token: jwt.sign({ userId: String(user._id) }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    }),
    user: publicUser(user),
    // `created` lets the client show the one-time username onboarding step for
    // brand-new accounts while letting returning users straight through.
    created,
  });

function credentials(body) {
  if (
    typeof body.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
    typeof body.password !== 'string' ||
    Buffer.byteLength(body.password) > 72
  )
    fail(400, 'Enter a valid email and password (maximum 72 bytes).');
  return body.email.trim().toLowerCase();
}

const exists = (username) => User.exists({ username });

// Create a user, retrying with a fresh suggested username if a concurrent
// signup grabbed the same handle first. A duplicate email is a real conflict
// and is surfaced as one; a duplicate username is retried, then surfaced only
// if an explicit (user-chosen) handle was taken.
async function createUser(doc, { nameForSuggestion, explicitUsername } = {}) {
  let username = doc.username;
  if (!username) username = await suggestUsername(nameForSuggestion || doc.name || doc.email, exists);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await User.create({ ...doc, username });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.email) fail(409, 'Email already in use');
      if (err.code === 11000 && err.keyPattern?.username) {
        if (explicitUsername) fail(409, 'That username is taken. Please choose another.');
        username = await suggestUsername(nameForSuggestion || doc.name || doc.email, exists);
        continue;
      }
      throw err;
    }
  }
  fail(409, 'Could not assign a unique username. Please try again.');
}

exports.register = wrap(async (req, res) => {
  const email = credentials(req.body);
  if (req.body.password.length < 8 || typeof req.body.name !== 'string' || !req.body.name.trim())
    fail(400, 'Name and a password of at least 8 characters are required.');
  if (await User.exists({ email })) fail(409, 'Email already in use');

  // An explicit username is validated and enforced; otherwise we generate one.
  let username;
  const explicitUsername = typeof req.body.username === 'string' && req.body.username.trim() !== '';
  if (explicitUsername) {
    username = normalizeUsername(req.body.username);
    const problem = usernameError(username);
    if (problem) fail(400, problem);
    if (await exists(username)) fail(409, 'That username is taken. Please choose another.');
  }

  const user = await createUser(
    {
      email,
      username,
      name: req.body.name.trim().slice(0, 100),
      passwordHash: await bcrypt.hash(req.body.password, 12),
    },
    { nameForSuggestion: req.body.name, explicitUsername },
  );
  res.status(201);
  respond(res, user, { created: true });
});

exports.login = wrap(async (req, res) => {
  const email = credentials(req.body);
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash || !(await bcrypt.compare(req.body.password, user.passwordHash)))
    fail(401, 'Invalid credentials');
  respond(res, user);
});

// Report which social providers this server can actually complete, so the
// frontend can render real buttons instead of permanently-disabled ones.
exports.providers = wrap(async (req, res) => {
  res.json({ google: Boolean(config.googleClientId) });
});

// GET /api/auth/username/available?username=… — report validity and
// availability so the client can give live feedback. Never reveals anything
// about who holds a taken handle, only that it is unavailable.
exports.checkUsername = wrap(async (req, res) => {
  const username = normalizeUsername(req.query.username);
  const problem = usernameError(username);
  if (problem) return res.json({ username, available: false, valid: false, reason: problem });
  const taken = await exists(username);
  res.json({
    username,
    valid: true,
    available: !taken,
    reason: taken ? 'That username is taken. Please choose another.' : '',
  });
});

// GET /api/auth/username/suggest?name=… — a readable, available suggestion.
exports.suggest = wrap(async (req, res) => {
  const username = await suggestUsername(req.query.name || 'reader', exists);
  res.json({ username });
});

// PATCH /api/auth/username — set a unique username for the signed-in account.
// Used by onboarding (and anywhere a user changes their handle). The DB unique
// index is the real guard; a duplicate-key error is a normal validation
// outcome, not a server error.
exports.claimUsername = wrap(async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const problem = usernameError(username);
  if (problem) fail(400, problem);
  if (await exists(username)) {
    const current = await User.findById(req.user.userId).select('username');
    // Allow re-saving one's own current handle (idempotent); reject others'.
    if (!current || current.username !== username)
      fail(409, 'That username is taken. Please choose another.');
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { username } },
      { new: true, runValidators: true },
    ).select('-passwordHash');
    if (!user) fail(401, 'Account no longer exists');
    res.json({ user: { ...user.toObject(), id: String(user._id) } });
  } catch (err) {
    if (err.code === 11000) fail(409, 'That username is taken. Please choose another.');
    throw err;
  }
});

// Sign in or register using a Google ID token (the GIS `credential`).
exports.google = wrap(async (req, res) => {
  const profile = await verifyGoogleIdToken(req.body?.credential);
  if (!profile.email || !profile.emailVerified)
    fail(401, 'Your Google account must have a verified email to sign in.');

  let user = await User.findOne({ googleId: profile.sub });
  if (user) return respond(res, user);

  // Link to an existing email account (returning user), or create a fresh one.
  user = await User.findOne({ email: profile.email });
  if (user) {
    user.googleId = profile.sub;
    if (!user.avatarUrl && profile.picture) user.avatarUrl = profile.picture;
    await user.save();
    return respond(res, user);
  }

  const created = await createUser(
    {
      email: profile.email,
      googleId: profile.sub,
      name: (profile.name || profile.email.split('@')[0]).slice(0, 100),
      avatarUrl: profile.picture || undefined,
    },
    { nameForSuggestion: profile.name || profile.email.split('@')[0] },
  );
  res.status(201);
  respond(res, created, { created: true });
});
