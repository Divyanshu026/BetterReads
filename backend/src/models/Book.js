// Mongoose ODM for MongoDB
const mongoose = require('mongoose');

// Book listing schema: one document per listed book
const BookSchema = new mongoose.Schema(
  {
    // Owner (user who listed the book)
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Book title
    title: { type: String, required: true, trim: true, maxlength: 200 },
    // Author name
    author: { type: String, trim: true, maxlength: 100 },
    // Optional ISBN for precise identification
    isbn: { type: String },
    // Primary genre label
    genre: { type: String },
    // Physical condition
    condition: { type: String, enum: ['New', 'Like New', 'Used'], default: 'Used' },
    // Listing description/details
    description: { type: String, maxlength: 3000 },
    // Image URLs (Cloudinary or similar)
    photos: {
      type: [String],
      validate: (value) =>
        value.length <= 5 && value.every((url) => /^(https:\/\/|\/uploads\/|\/covers\/)/.test(url)),
    },
    // Price in minor units (e.g., cents)
    priceCents: { type: Number, default: 0, min: 0, max: 10000000, validate: Number.isInteger },
    // Currency code (e.g., USD/INR)
    currency: { type: String, default: 'INR', enum: ['INR'] },
    reservationId: { type: String, index: true },
    // Whether barter/exchange is possible for this listing
    barterAvailable: { type: Boolean, default: false },
    borrowAvailable: { type: Boolean, default: false },
    // Location info (for city-based filtering)
    location: { city: { type: String } },
    // Availability status in marketplace
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'exchanged'],
      default: 'available',
    },
  },
  { timestamps: true },
);

// Indexes matching the real query/sort patterns in booksController.listBooks,
// which otherwise does a full collection scan on every catalog/profile load.
// Each compound index puts the equality field first, then the default sort key
// (createdAt), per MongoDB's equality-sort-range ordering.
// Catalog/home: filter by status, newest first.
BookSchema.index({ status: 1, createdAt: -1 });
// Dashboard/reader profile: a user's own listings, newest first.
BookSchema.index({ ownerId: 1, createdAt: -1 });
// Secondary filters applied on the catalog.
BookSchema.index({ genre: 1 });
BookSchema.index({ 'location.city': 1 });

// Export the Book model
module.exports = mongoose.model('Book', BookSchema);
