const Stripe = require('stripe');
const config = require('../config');
const stripe = config.stripeSecret
  ? new Stripe(config.stripeSecret, { apiVersion: '2023-08-16' })
  : null;
module.exports = { stripe };
