// Mongoose ODM for MongoDB
const mongoose = require('mongoose');

// Book listing schema: one document per listed book
const BookSchema = new mongoose.Schema({
  // Owner (user who listed the book)
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Book title
  title: { type: String, required: true },
  // Author name
  author: { type: String },
  // Optional ISBN for precise identification
  isbn: { type: String },
  // Primary genre label
  genre: { type: String },
  // Physical condition
  condition: { type: String, enum: ['New', 'Like New', 'Used'], default: 'Used' },
  // Listing description/details
  description: { type: String },
  // Image URLs (Cloudinary or similar)
  photos: [{ type: String }],
  // Price in minor units (e.g., cents)
  priceCents: { type: Number, default: 0 },
  // Currency code (e.g., USD/INR)
  currency: { type: String, default: 'USD' },
  // Whether barter/exchange is possible for this listing
  barterAvailable: { type: Boolean, default: false },
  // Location info (for city-based filtering)
  location: { city: { type: String } },
  // Availability status in marketplace
  status: { type: String, enum: ['available', 'reserved', 'sold', 'exchanged'], default: 'available' },
}, { timestamps: true });

// Export the Book model
module.exports = mongoose.model('Book', BookSchema);
