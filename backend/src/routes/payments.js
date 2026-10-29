// Express router for payment endpoints (Stripe integration)
const express = require('express');
const router = express.Router();
const {
  createCheckout,
  createCartCheckout,
  getPaymentStatus,
} = require('../controllers/paymentsController');
const { requireAuth } = require('../middleware/auth');

// The signature-verified raw webhook is mounted before JSON parsing in app.js.

// POST /api/payments/checkout — create checkout session (authenticated)
router.post('/checkout', requireAuth, createCheckout);

// POST /api/payments/cart-checkout — create checkout session for cart items (authenticated)
router.post('/cart-checkout', requireAuth, createCartCheckout);

// GET /api/payments/status/:offerId — check payment status (authenticated)
router.get('/status/:offerId', requireAuth, getPaymentStatus);

module.exports = router;
