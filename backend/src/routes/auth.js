// Express router for authentication endpoints
const express = require('express');
const router = express.Router();
// Controller handlers: register and login
const { register, login } = require('../controllers/authController');

// POST /api/auth/register — create a new account
router.post('/register', register);
// POST /api/auth/login — authenticate and receive a JWT
router.post('/login', login);
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
