// Mongoose is the ODM (Object Data Modeling) library for MongoDB
const mongoose = require('mongoose');

// User document schema: defines how user records are stored
const UserSchema = new mongoose.Schema(
  {
    // Unique email used for login and identification
    email: { type: String, required: true, unique: true },
    // Unique handle shown as @username. Stored normalized (lowercased); a unique
    // index enforces uniqueness at the database level so concurrent signups can
    // never create two of the same. Sparse so legacy users without one (pending
    // migration) don't collide on null.
    username: {
      type: String,
      unique: true,
      sparse: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9]([a-z0-9._]*[a-z0-9])?$/,
    },
    // Hashed password (bcrypt). Plaintext is never stored. Optional for social accounts.
    passwordHash: { type: String },
    // Google account subject id, set for users who signed in with Google.
    googleId: { type: String, index: true, sparse: true },
    // Display name shown in profiles
    name: { type: String, trim: true, maxlength: 100 },
    // Short biography/about
    bio: { type: String, maxlength: 1000 },
    // Preferred genres (for recommendations and filtering)
    genres: [{ type: String }],
    // City (for proximity-based features/events)
    city: { type: String, maxlength: 100 },
    // Link to avatar image (Cloudinary or similar)
    avatarUrl: { type: String },
    // Role for authorization: 'user' or 'admin'
    role: { type: String, default: 'user' },
    // Reputation summary (score plus number of reviews)
    reputation: { score: { type: Number, default: 0 }, reviewsCount: { type: Number, default: 0 } },
    // Wishlist: saved/favorite book IDs
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
  },
  { timestamps: true },
);

// Export a Mongoose model named 'User' (backed by the users collection)
module.exports = mongoose.model('User', UserSchema);
