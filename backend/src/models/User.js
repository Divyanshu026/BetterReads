// Mongoose is the ODM (Object Data Modeling) library for MongoDB
const mongoose = require('mongoose');

// User document schema: defines how user records are stored
const UserSchema = new mongoose.Schema({
  // Unique email used for login and identification
  email: { type: String, required: true, unique: true },
  // Hashed password (bcrypt). Plaintext is never stored.
  passwordHash: { type: String },
  // Display name shown in profiles
  name: { type: String },
  // Short biography/about
  bio: { type: String },
  // Preferred genres (for recommendations and filtering)
  genres: [{ type: String }],
  // City (for proximity-based features/events)
  city: { type: String },
  // Link to avatar image (Cloudinary or similar)
  avatarUrl: { type: String },
  // Role for authorization: 'user' or 'admin'
  role: { type: String, default: 'user' },
  // Reputation summary (score plus number of reviews)
  reputation: { score: { type: Number, default: 0 }, reviewsCount: { type: Number, default: 0 } },
  // Wishlist: saved/favorite book IDs
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
}, { timestamps: true });

// Export a Mongoose model named 'User' (backed by the users collection)
module.exports = mongoose.model('User', UserSchema);
