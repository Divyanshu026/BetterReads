// Express router for user profile endpoints
const express = require('express');
const router = express.Router();
// Controller actions: get and update user profile
const { getProfile, updateProfile } = require('../controllers/usersController');
// Middleware to require a valid JWT for protected routes
const { requireAuth } = require('../middleware/auth');

// GET /api/users/:id — public profile (email is masked/omitted)
router.get('/:id', getProfile);
// PATCH /api/users/:id — update own profile (must be authenticated and owner)
router.patch('/:id', requireAuth, updateProfile);

// Export the router
module.exports = router;
