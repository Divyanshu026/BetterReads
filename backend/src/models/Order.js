const mongoose = require('mongoose');
const Order = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        title: String,
        priceCents: Number,
        photo: String,
        fulfillment: {
          type: String,
          enum: ['processing', 'shipped', 'delivered'],
          default: 'processing',
        },
        tracking: { type: String, maxlength: 200 },
      },
    ],
    amountCents: Number,
    currency: { type: String, default: 'INR' },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    status: { type: String, enum: ['pending', 'paid', 'expired'], default: 'pending' },
    stripeSessionId: { type: String, unique: true, sparse: true },
    checkoutUrl: String,
    shipping: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);
module.exports = mongoose.model('Order', Order);
