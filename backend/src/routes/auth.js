// Express router for authentication endpoints
const express = require('express');
const router = express.Router();
// Controller handlers: register and login
const { register, login } = require('../controllers/authController');

// POST /api/auth/register — create a new account
router.post('/register', register);
// POST /api/auth/login — authenticate and receive a JWT
router.post('/login', login);

// Export the router to be mounted in app.js
module.exports = router;
