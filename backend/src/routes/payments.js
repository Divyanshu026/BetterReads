// Express router for payment endpoints (Stripe integration)
const express = require('express');
const router = express.Router();
const { createCheckout, createCartCheckout, handleWebhook, getPaymentStatus } = require('../controllers/paymentsController');
const { requireAuth } = require('../middleware/auth');

// POST /api/payments/webhook — Stripe webhook (no auth, uses signature verification)
// Note: This needs raw body parsing, handled in app.js
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// POST /api/payments/checkout — create checkout session (authenticated)
router.post('/checkout', requireAuth, createCheckout);

// POST /api/payments/cart-checkout — create checkout session for cart items (authenticated)
router.post('/cart-checkout', requireAuth, createCartCheckout);

// GET /api/payments/status/:offerId — check payment status (authenticated)
router.get('/status/:offerId', requireAuth, getPaymentStatus);

module.exports = router;
