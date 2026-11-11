// Express router for payment endpoints (Stripe integration)
const express = require('express');
const router = express.Router();
const {
  createCheckout,
  createCartCheckout,
  getPaymentStatus,
} = require('../controllers/paymentsController');
const { requireAuth, requireVerified } = require('../middleware/auth');

// The signature-verified raw webhook is mounted before JSON parsing in app.js.

// POST /api/payments/checkout — create checkout session (verified users only)
router.post('/checkout', requireAuth, requireVerified, createCheckout);

// POST /api/payments/cart-checkout — create checkout session for cart items (verified users only)
router.post('/cart-checkout', requireAuth, requireVerified, createCartCheckout);

// GET /api/payments/status/:offerId — check payment status (authenticated)
router.get('/status/:offerId', requireAuth, getPaymentStatus);

module.exports = router;
