// Stripe SDK for payments (Checkout sessions, webhooks, etc.)
const Stripe = require('stripe');
const config = require('../config');

// Initialize Stripe client with the secret key from environment
const stripe = new Stripe(config.stripeSecret || '', { apiVersion: '2023-08-16' });

/**
 * Create a Stripe Checkout Session for a single line item purchase.
 * @param {Object} params
 * @param {number} params.amountCents - Price in minor units (e.g., cents)
 * @param {string} [params.currency='usd'] - Currency code (usd/inr/...)
 * @param {string} params.successUrl - URL to redirect after successful payment
 * @param {string} params.cancelUrl - URL to redirect if user cancels
 * @param {Object} [params.metadata={}] - Extra info to attach (e.g., offerId)
 */
async function createCheckoutSession({ amountCents, currency = 'usd', successUrl, cancelUrl, metadata = {} }) {
  if (!config.stripeSecret) throw new Error('Stripe secret not configured');
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency,
        product_data: { name: 'Book purchase' },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });
  return session;
}

module.exports = { createCheckoutSession, stripe };
