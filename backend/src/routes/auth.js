// Express router for authentication endpoints
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
// Controller handlers.
const {
  register,
  login,
  google,
  refresh,
  logout,
  logoutAll,
  sessions,
  verifyEmail,
  verifyCode,
  resendVerification,
  forgotPassword,
  resetPassword,
  providers,
  checkUsername,
  suggest,
  claimUsername,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { wrap } = require('../lib/http');

// A stricter limiter for endpoints that send email or probe credentials, to
// curb abuse (enumeration, mail-bombing, reset flooding) beyond the router-wide
// auth limiter applied in app.js.
// Disable rate limiting under the test runner (many requests share one IP).
const skipInTest = () => require('../config').nodeEnv === 'test';

const sensitiveLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, skip: skipInTest });

// Typed-code verification is the small 6-digit space, so throttle guesses per
// IP in addition to the per-code attempt cap enforced in the controller.
const codeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, skip: skipInTest });

// GET /api/auth/providers — which social sign-in options this server supports
router.get('/providers', providers);
// GET /api/auth/username/available?username=… — is this handle free and valid
router.get('/username/available', checkUsername);
// GET /api/auth/username/suggest?name=… — a readable, available suggestion
router.get('/username/suggest', suggest);
// POST /api/auth/register — create a new account (emails a verification link)
router.post('/register', register);
// POST /api/auth/login — authenticate and receive cookies (+ token in body)
router.post('/login', login);
// POST /api/auth/google — sign in or register with a Google ID token
router.post('/google', google);
// POST /api/auth/refresh — rotate the refresh session and reissue the access cookie
router.post('/refresh', refresh);
// POST /api/auth/logout — revoke the current session and clear cookies
router.post('/logout', logout);
// POST /api/auth/logout-all — revoke every session for the signed-in account
router.post('/logout-all', requireAuth, logoutAll);
// GET /api/auth/sessions — list the account's active sessions
router.get('/sessions', requireAuth, sessions);
// GET|POST /api/auth/verify-email?token=… — confirm an email address via link
router.get('/verify-email', verifyEmail);
router.post('/verify-email', verifyEmail);
// POST /api/auth/verify-code — confirm the signed-in account's email by code
router.post('/verify-code', codeLimiter, requireAuth, verifyCode);
// POST /api/auth/resend-verification — resend the verification email
router.post('/resend-verification', sensitiveLimiter, requireAuth, resendVerification);
// POST /api/auth/forgot-password — email a reset link (always 200)
router.post('/forgot-password', sensitiveLimiter, forgotPassword);
// POST /api/auth/reset-password — set a new password from a reset token
router.post('/reset-password', sensitiveLimiter, resetPassword);
// PATCH /api/auth/username — set/claim a unique username (onboarding)
router.patch('/username', requireAuth, claimUsername);
router.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const user = await require('../models/User').findById(req.user.userId).select('-passwordHash');
    if (!user) return res.status(401).json({ error: { message: 'Account no longer exists' } });
    res.json({ user: { ...user.toObject(), id: String(user._id) } });
  }),
);

// Export the router to be mounted in app.js
module.exports = router;
