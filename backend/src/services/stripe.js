// Stripe SDK for payments (Checkout sessions, webhooks, etc.)
const Stripe = require('stripe');
const config = require('../config');

// Initialize Stripe client with the secret key from environment
const stripe = new Stripe(config.stripeSecret || '', { apiVersion: '2023-08-16' });

/**
 * Create a Stripe Checkout Session for a single line item purchase.
 * @param {Object} params
 * @param {number} params.amountCents - Price in minor units (paisa for INR, cents for USD)
 * @param {string} [params.currency='inr'] - Currency code (inr for Indian Rupees)
 * @param {string} params.successUrl - URL to redirect after successful payment
 * @param {string} params.cancelUrl - URL to redirect if user cancels
 * @param {Object} [params.metadata={}] - Extra info to attach (e.g., offerId)
 * @param {Array} [params.lineItems=[]] - Array of items for checkout
 */
async function createCheckoutSession({ amountCents, currency = 'inr', successUrl, cancelUrl, metadata = {}, lineItems = [], productName = 'Book purchase' }) {
  if (!config.stripeSecret) throw new Error('Stripe secret not configured');
  
  // If lineItems are provided, use them; otherwise create a single item
  const items = lineItems.length > 0 ? lineItems : [{
    price_data: {
      currency,
      product_data: { name: productName },
      unit_amount: amountCents,
    },
    quantity: 1,
  }];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: items,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    billing_address_collection: 'required',
    shipping_address_collection: {
      allowed_countries: ['IN'], // Only India for INR
    },
  });
  return session;
}

/**
 * Create a checkout session for cart items
 */
async function createCartCheckoutSession({ cartItems, successUrl, cancelUrl, metadata = {} }) {
  if (!config.stripeSecret) throw new Error('Stripe secret not configured');

  const lineItems = cartItems.map(item => ({
    price_data: {
      currency: 'inr',
      product_data: { 
        name: item.title,
        description: `by ${item.author}`,
        images: item.photos && item.photos.length > 0 ? [item.photos[0]] : [],
      },
      unit_amount: item.priceCents || 0,
    },
    quantity: item.quantity || 1,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    billing_address_collection: 'required',
    shipping_address_collection: {
      allowed_countries: ['IN'],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: {
            amount: 5000, // ₹50 shipping
            currency: 'inr',
          },
          display_name: 'Standard Shipping',
          delivery_estimate: {
            minimum: {
              unit: 'business_day',
              value: 3,
            },
            maximum: {
              unit: 'business_day',
              value: 5,
            },
          },
        },
      },
    ],
  });
  return session;
}

module.exports = { createCheckoutSession, createCartCheckoutSession, stripe };
