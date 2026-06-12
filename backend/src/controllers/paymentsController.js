// Payments controller - Stripe checkout and webhook handling
const { createCheckoutSession, createCartCheckoutSession, stripe } = require('../services/stripe');
const Offer = require('../models/Offer');
const Book = require('../models/Book');
const config = require('../config');

// POST /api/payments/checkout — create a Stripe Checkout session for an accepted offer
async function createCheckout(req, res) {
  try {
    const { offerId } = req.body;
    const userId = req.user.userId;

    // Find the offer
    const offer = await Offer.findById(offerId).populate('listingId');
    if (!offer) {
      return res.status(404).json({ error: { message: 'Offer not found' } });
    }

    // Only the proposer can pay
    if (String(offer.proposerId) !== userId) {
      return res.status(403).json({ error: { message: 'Forbidden: only proposer can pay' } });
    }

    // Only accepted purchase offers can be paid
    if (offer.type !== 'purchase') {
      return res.status(400).json({ error: { message: 'Only purchase offers require payment' } });
    }
    if (offer.status !== 'accepted') {
      return res.status(400).json({ error: { message: 'Offer must be accepted before payment' } });
    }

    // Determine the amount (use offer amount or listing price)
    const amountCents = offer.amountCents || offer.listingId.priceCents;
    const currency = 'inr'; // Use INR for Indian Rupees

    // Build URLs for redirect
    const baseUrl = config.frontendUrl || 'http://localhost:5173';
    const successUrl = `${baseUrl}/payment/success?offerId=${offerId}`;
    const cancelUrl = `${baseUrl}/payment/cancel?offerId=${offerId}`;

    // Create Stripe Checkout session
    const session = await createCheckoutSession({
      amountCents,
      currency,
      successUrl,
      cancelUrl,
      metadata: {
        offerId: offerId,
        listingId: String(offer.listingId._id),
        buyerId: userId,
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Create checkout error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// POST /api/payments/cart-checkout — create a Stripe Checkout session for cart items
async function createCartCheckout(req, res) {
  try {
    const { cartItems } = req.body;
    const userId = req.user.userId;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: { message: 'Cart is empty' } });
    }

    // Validate and process cart items
    const processedItems = [];
    const bookIds = [];
    
    for (const item of cartItems) {
      // Verify book exists and is available
      const book = await Book.findById(item._id);
      if (!book) {
        return res.status(404).json({ error: { message: `Book not found: ${item.title}` } });
      }
      if (book.status === 'sold') {
        return res.status(400).json({ error: { message: `Book already sold: ${item.title}` } });
      }
      
      processedItems.push({
        ...item,
        priceCents: book.priceCents,
        title: book.title,
        author: book.author,
        photos: book.photos,
        quantity: 1,
      });
      bookIds.push(item._id);
    }

    // Build URLs for redirect
    const baseUrl = config.frontendUrl || 'http://localhost:5173';
    const successUrl = `${baseUrl}/payment/success?type=cart`;
    const cancelUrl = `${baseUrl}/cart`;

    // Create Stripe Checkout session
    const session = await createCartCheckoutSession({
      cartItems: processedItems,
      successUrl,
      cancelUrl,
      metadata: {
        buyerId: userId,
        bookIds: JSON.stringify(bookIds),
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Create cart checkout error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// POST /api/payments/webhook — handle Stripe webhook events
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the webhook signature (req.body should be raw buffer)
    event = stripe.webhooks.constructEvent(
      req.rawBody || req.body,
      sig,
      config.stripeWebhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { offerId, listingId } = session.metadata;

      // Update offer to reflect payment completion
      if (offerId) {
        await Offer.findByIdAndUpdate(offerId, {
          status: 'accepted',
          paymentCompleted: true,
        });
      }

      // Mark the book as sold
      if (listingId) {
        await Book.findByIdAndUpdate(listingId, { status: 'sold' });
      }

      console.log('Payment completed for offer:', offerId);
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object;
      const { offerId } = session.metadata;

      // Optionally revert the offer status
      console.log('Checkout session expired for offer:', offerId);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}

// GET /api/payments/status/:offerId — check payment status for an offer
async function getPaymentStatus(req, res) {
  try {
    const offer = await Offer.findById(req.params.offerId);
    if (!offer) {
      return res.status(404).json({ error: { message: 'Offer not found' } });
    }

    const book = await Book.findById(offer.listingId);

    res.json({
      offerId: offer._id,
      offerStatus: offer.status,
      paymentCompleted: offer.paymentCompleted || false,
      bookStatus: book?.status,
    });
  } catch (err) {
    console.error('Get payment status error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

module.exports = { createCheckout, createCartCheckout, handleWebhook, getPaymentStatus };
