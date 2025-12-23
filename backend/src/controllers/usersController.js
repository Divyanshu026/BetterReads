// User model for reading/updating profile documents
const User = require('../models/User');

// GET /api/users/:id — fetch a public profile by id
async function getProfile(req, res) {
  const id = req.params.id; // read the :id route param
  // Find user by id and omit the passwordHash for safety
  const user = await User.findById(id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: { message: 'User not found' } });
  // Return the user document
  res.json({ user });
}

// PATCH /api/users/:id — update own profile (requires JWT; only owner can update)
async function updateProfile(req, res) {
  const id = req.params.id; // target user id
  // Authorization check: ensure JWT's userId matches the id being updated
  if (req.user.userId !== id) return res.status(403).json({ error: { message: 'Forbidden' } });
  const updates = req.body; // fields to update
  // Update and return the new document (omit sensitive hash)
  const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-passwordHash');
  res.json({ user });
}

// Export controller functions
module.exports = { getProfile, updateProfile };
