// Express router for authentication endpoints
const express = require('express');
const router = express.Router();
// Controller handlers: register, login, Google sign-in, and provider status
const { register, login, google, providers } = require('../controllers/authController');

// GET /api/auth/providers — which social sign-in options this server supports
router.get('/providers', providers);
// POST /api/auth/register — create a new account
router.post('/register', register);
// POST /api/auth/login — authenticate and receive a JWT
router.post('/login', login);
// POST /api/auth/google — sign in or register with a Google ID token
router.post('/google', google);
router.get(
  '/me',
  require('../middleware/auth').requireAuth,
  require('../lib/http').wrap(async (req, res) => {
    const user = await require('../models/User').findById(req.user.userId).select('-passwordHash');
    if (!user) return res.status(401).json({ error: { message: 'Account no longer exists' } });
    res.json({ user: { ...user.toObject(), id: String(user._id) } });
  }),
);

// Export the router to be mounted in app.js
module.exports = router;
