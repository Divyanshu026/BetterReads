const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const Token = require('../models/Token');
const config = require('../config');
const { wrap, fail } = require('../lib/http');
const { verifyGoogleIdToken } = require('../services/google');
const { normalizeUsername, usernameError, suggestUsername } = require('../lib/username');
const { issueToken, issueVerification, consumeToken, consumeCode, randomToken, hashToken } = require('../lib/tokens');
const { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } = require('../lib/cookies');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/mailer');

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (emailed link)
const VERIFY_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes (typed code)
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  avatarUrl: user.avatarUrl,
  emailVerified: Boolean(user.emailVerified),
});

const signAccess = (user) =>
  jwt.sign({ userId: String(user._id) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// Create a server-side refresh session and return the raw (un-hashed) refresh
// token. Only the hash is persisted.
async function createSession(req, userId) {
  const raw = randomToken();
  await Session.create({
    userId,
    tokenHash: hashToken(raw),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 400),
    ip: (req.ip || '').slice(0, 60),
    expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
  });
  return raw;
}

// Issue an access token + a fresh refresh session, set all auth cookies, and
// return the legacy JSON body ({ token, user, created }) so existing clients,
// socket auth, and tests keep working alongside the cookie transport.
async function respond(req, res, user, { created = false, status } = {}) {
  const access = signAccess(user);
  const refresh = await createSession(req, user._id);
  const persist = req.body?.remember === undefined ? true : Boolean(req.body.remember);
  setAuthCookies(res, { access, refresh }, { persist });
  if (status) res.status(status);
  res.json({ token: access, user: publicUser(user), created });
}

// Build the links embedded in verification / reset emails.
const verifyLink = (raw) => `${config.appUrl}/verify-email?token=${raw}`;
const resetLink = (raw) => `${config.appUrl}/reset-password?token=${raw}`;

// Generate a verification token and email it. Best-effort: a mail failure must
// not fail signup, since the user can request a resend.
async function sendVerification(user) {
  try {
    const { raw, code } = await issueVerification(Token, {
      userId: user._id,
      ttlMs: VERIFY_TTL_MS,
      codeTtlMs: VERIFY_CODE_TTL_MS,
    });
    await sendVerificationEmail(user, verifyLink(raw), code);
  } catch (err) {
    console.error('Failed to send verification email', err.message);
  }
}

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
  await sendVerification(user);
  await respond(req, res, user, { created: true, status: 201 });
});

exports.login = wrap(async (req, res) => {
  const email = credentials(req.body);
  const user = await User.findOne({ email });
  if (!user || !user.passwordHash || !(await bcrypt.compare(req.body.password, user.passwordHash)))
    fail(401, 'Invalid credentials');
  await respond(req, res, user);
});

// POST /api/auth/refresh — rotate the refresh session and reissue the access
// cookie. The old refresh token is replaced on every use, so presenting a
// previously-rotated (e.g. stolen and already-used) token matches no active
// session and is rejected.
exports.refresh = wrap(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) {
    clearAuthCookies(res);
    fail(401, 'Your session has expired. Please sign in again.');
  }
  const session = await Session.findOne({
    tokenHash: hashToken(raw),
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  if (!session) {
    clearAuthCookies(res);
    fail(401, 'Your session has expired. Please sign in again.');
  }
  const user = await User.findById(session.userId);
  if (!user) {
    await Session.deleteOne({ _id: session._id });
    clearAuthCookies(res);
    fail(401, 'Account no longer exists');
  }
  // Rotate the refresh token in place (same session row, new secret).
  const nextRaw = randomToken();
  session.tokenHash = hashToken(nextRaw);
  session.lastUsedAt = new Date();
  await session.save();
  const access = signAccess(user);
  setAuthCookies(res, { access, refresh: nextRaw }, { persist: true });
  res.json({ token: access, user: publicUser(user) });
});

// POST /api/auth/logout — revoke the current session and clear cookies.
exports.logout = wrap(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (raw) await Session.deleteOne({ tokenHash: hashToken(raw) });
  clearAuthCookies(res);
  res.json({ ok: true });
});

// POST /api/auth/logout-all — revoke every session for the signed-in user
// ("log out everywhere"). Requires a valid access token.
exports.logoutAll = wrap(async (req, res) => {
  await Session.deleteMany({ userId: req.user.userId });
  clearAuthCookies(res);
  res.json({ ok: true });
});

// GET /api/auth/sessions — list the account's active sessions, most recent
// first, flagging the one making this request.
exports.sessions = wrap(async (req, res) => {
  const currentRaw = req.cookies?.[REFRESH_COOKIE];
  const currentHash = currentRaw ? hashToken(currentRaw) : null;
  const rows = await Session.find({
    userId: req.user.userId,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastUsedAt: -1 })
    .select('userAgent ip lastUsedAt createdAt tokenHash');
  res.json({
    sessions: rows.map((s) => ({
      id: String(s._id),
      userAgent: s.userAgent || '',
      ip: s.ip || '',
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
      current: currentHash != null && s.tokenHash === currentHash,
    })),
  });
});

// GET|POST /api/auth/verify-email?token=… — consume a verification token and
// mark the account verified. Idempotent-ish: a second use of the same link
// fails (single-use), but an already-verified account is reported as success.
exports.verifyEmail = wrap(async (req, res) => {
  const raw = req.query.token || req.body?.token;
  const record = await consumeToken(Token, { raw, type: 'verify' });
  if (!record) fail(400, 'This verification link is invalid or has expired.');
  const user = await User.findByIdAndUpdate(
    record.userId,
    { $set: { emailVerified: true, emailVerifiedAt: new Date() } },
    { new: true },
  );
  if (!user) fail(400, 'Account no longer exists');
  res.json({ ok: true, user: publicUser(user) });
});

// POST /api/auth/verify-code — confirm the signed-in account's email with the
// typed 6-digit code. Scoped to the authenticated user (a 6-digit code is not
// globally unique), with a per-code attempt cap enforced in consumeCode.
exports.verifyCode = wrap(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) fail(401, 'Account no longer exists');
  if (user.emailVerified) return res.json({ ok: true, user: publicUser(user) });
  const result = await consumeCode(Token, { userId: user._id, type: 'verify', code: req.body?.code });
  if (!result.ok) fail(400, result.reason);
  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  await user.save();
  res.json({ ok: true, user: publicUser(user) });
});

// POST /api/auth/resend-verification — re-send the verification email for the
// signed-in account. No-op success if already verified.
exports.resendVerification = wrap(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) fail(401, 'Account no longer exists');
  if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true });
  await sendVerification(user);
  res.json({ ok: true });
});

// POST /api/auth/forgot-password — email a reset link. Always responds 200 with
// the same body whether or not the email exists, to avoid revealing which
// addresses have accounts. Accounts without a password (Google-only) are
// skipped silently.
exports.forgotPassword = wrap(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const user = await User.findOne({ email });
    if (user && user.passwordHash) {
      try {
        const raw = await issueToken(Token, { userId: user._id, type: 'reset', ttlMs: RESET_TTL_MS });
        await sendPasswordResetEmail(user, resetLink(raw));
      } catch (err) {
        console.error('Failed to send reset email', err.message);
      }
    }
  }
  res.json({ ok: true });
});

// POST /api/auth/reset-password — consume a reset token, set the new password,
// and revoke every existing session so a compromised login cannot persist.
exports.resetPassword = wrap(async (req, res) => {
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72)
    fail(400, 'Choose a password of at least 8 characters (maximum 72 bytes).');
  const record = await consumeToken(Token, { raw: req.body?.token, type: 'reset' });
  if (!record) fail(400, 'This reset link is invalid or has expired.');
  const user = await User.findById(record.userId);
  if (!user) fail(400, 'Account no longer exists');
  user.passwordHash = await bcrypt.hash(password, 12);
  // A verified reset link also proves control of the inbox.
  if (!user.emailVerified) {
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
  }
  await user.save();
  await Session.deleteMany({ userId: user._id });
  clearAuthCookies(res);
  res.json({ ok: true });
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
  if (user) return respond(req, res, user);

  // Link to an existing email account (returning user), or create a fresh one.
  user = await User.findOne({ email: profile.email });
  if (user) {
    user.googleId = profile.sub;
    // Google asserts a verified email, so a linked account becomes verified.
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
    }
    if (!user.avatarUrl && profile.picture) user.avatarUrl = profile.picture;
    await user.save();
    return respond(req, res, user);
  }

  const created = await createUser(
    {
      email: profile.email,
      googleId: profile.sub,
      name: (profile.name || profile.email.split('@')[0]).slice(0, 100),
      avatarUrl: profile.picture || undefined,
      // Social sign-in arrives already verified.
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    { nameForSuggestion: profile.name || profile.email.split('@')[0] },
  );
  await respond(req, res, created, { created: true, status: 201 });
});
