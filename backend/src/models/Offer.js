// Mongoose ODM for MongoDB
const mongoose = require('mongoose');

// Offer schema represents a purchase or barter proposal for a listed book
const OfferSchema = new mongoose.Schema({
  // The target listing (book being purchased or exchanged)
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  // User who made the offer
  proposerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Offer type: direct purchase or barter (exchange of items)
  type: { type: String, enum: ['purchase', 'barter'], required: true },
  // If barter, the books offered in exchange
  offeredBookIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
  // If purchase, the monetary amount offered (in cents)
  amountCents: { type: Number },
  // Current status of the offer
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending' },
  // Whether payment has been completed (for purchase offers)
  paymentCompleted: { type: Boolean, default: false },
  // Stripe session ID for tracking
  stripeSessionId: { type: String },
}, { timestamps: true });

// Export the Offer model
module.exports = mongoose.model('Offer', OfferSchema);
