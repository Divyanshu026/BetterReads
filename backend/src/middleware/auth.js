// JSON Web Token library for verifying the short-lived access token
const jwt = require('jsonwebtoken');
// Central configuration with JWT secret and expiry
const config = require('../config');
const { ACCESS_COOKIE } = require('../lib/cookies');
const User = require('../models/User');

// Extract the access token from the httpOnly cookie (the authoritative source
// for browsers) or, as a fallback, the `Authorization: Bearer` header. The
// header path keeps non-browser clients, socket tests, and older integrations
// working while the cookie is the primary transport.
function readAccessToken(req) {
  const fromCookie = req.cookies?.[ACCESS_COOKIE];
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

// Middleware to protect routes: verifies the access token and attaches the
// decoded `{ userId }` payload to req.user (shape preserved for all handlers).
function requireAuth(req, res, next) {
  const token = readAccessToken(req);
  if (!token) return res.status(401).json({ error: { message: 'Unauthorized' } });
  try {
    req.user = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Invalid token' } });
  }
}

// Soft gate: only lets a request through if the account's email is verified.
// Runs after requireAuth. Returns 403 with a machine-readable code so the
// frontend can prompt the user to verify (rather than treating it as a login
// failure). Used on sensitive routers: payments/checkout, offers, chats.
async function requireVerified(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select('emailVerified');
    if (!user) return res.status(401).json({ error: { message: 'Account no longer exists' } });
    if (!user.emailVerified)
      return res.status(403).json({
        error: { message: 'Please verify your email to continue.', code: 'EMAIL_NOT_VERIFIED' },
      });
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, requireVerified, readAccessToken };
