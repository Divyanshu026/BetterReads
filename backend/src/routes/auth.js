// Express router for authentication endpoints
const express = require('express');
const router = express.Router();
// Controller handlers: register, login, Google sign-in, provider status,
// username availability, and claiming a username during onboarding.
const {
  register,
  login,
  google,
  providers,
  checkUsername,
  suggest,
  claimUsername,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { wrap } = require('../lib/http');

// GET /api/auth/providers — which social sign-in options this server supports
router.get('/providers', providers);
// GET /api/auth/username/available?username=… — is this handle free and valid
router.get('/username/available', checkUsername);
// GET /api/auth/username/suggest?name=… — a readable, available suggestion
router.get('/username/suggest', suggest);
// POST /api/auth/register — create a new account
router.post('/register', register);
// POST /api/auth/login — authenticate and receive a JWT
router.post('/login', login);
// POST /api/auth/google — sign in or register with a Google ID token
router.post('/google', google);
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
