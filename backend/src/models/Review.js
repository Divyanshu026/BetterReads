// Mongoose ODM for MongoDB
const mongoose = require('mongoose');

// Review schema - user ratings and feedback after trades
const ReviewSchema = new mongoose.Schema({
  // The user being reviewed
  revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // The user writing the review
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Related offer/transaction (optional, for context)
  offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
  // Rating from 1 to 5
  rating: { type: Number, required: true, min: 1, max: 5 },
  // Review text/comment
  comment: { type: String, maxlength: 1000 },
  // Type of transaction being reviewed
  transactionType: { type: String, enum: ['purchase', 'barter', 'general'], default: 'general' },
}, { timestamps: true });

// Prevent duplicate reviews for the same offer
ReviewSchema.index({ reviewerId: 1, offerId: 1 }, { unique: true, sparse: true });

// Index for querying reviews by reviewee
ReviewSchema.index({ revieweeId: 1, createdAt: -1 });

// Export the Review model
module.exports = mongoose.model('Review', ReviewSchema);
