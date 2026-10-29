const mongoose = require('mongoose');
const { stripe } = require('../services/stripe');
const Offer = require('../models/Offer');
const Book = require('../models/Book');
const Order = require('../models/Order');
const config = require('../config');
const { wrap, fail } = require('../lib/http');

async function checkout(req, res, offerMode) {
  if (!stripe)
    fail(503, 'Payments are not configured. Please contact the marketplace administrator.');
  let offer;
  if (offerMode) {
    offer = await Offer.findById(req.body.offerId);
    if (!offer || String(offer.proposerId) !== req.user.userId) fail(404, 'Offer not found');
    if (offer.type !== 'purchase' || offer.status !== 'accepted' || offer.paymentCompleted)
      fail(409, 'This offer cannot be paid');
  }
  const ids = offer
    ? [String(offer.listingId)]
    : Array.isArray(req.body.cartItems)
      ? req.body.cartItems.map((item) => item._id)
      : [];
  if (!ids.length || ids.length > 20 || new Set(ids).size !== ids.length)
    fail(400, 'Choose between 1 and 20 unique books');
  const orderId = new mongoose.Types.ObjectId();
  const dbSession = await mongoose.startSession();
  let order;
  try {
    await dbSession.withTransaction(async () => {
      const books = await Book.find({ _id: { $in: ids } }).session(dbSession);
      if (books.length !== ids.length) fail(404, 'One or more books no longer exist');
      for (const book of books) {
        if (String(book.ownerId) === req.user.userId)
          fail(400, 'You cannot purchase your own book');
        if (book.currency !== 'INR') fail(400, 'Only INR listings are supported');
        if (offer ? book.reservationId !== String(offer._id) : book.status !== 'available')
          fail(409, 'One or more books are no longer available');
        if (
          !Number.isInteger(offer ? offer.amountCents : book.priceCents) ||
          (offer ? offer.amountCents : book.priceCents) < 100
        )
          fail(400, 'Minimum purchase price is ₹1');
        book.status = 'reserved';
        book.reservationId = String(orderId);
        await book.save({ session: dbSession });
      }
      [order] = await Order.create(
        [
          {
            _id: orderId,
            buyerId: req.user.userId,
            offerId: offer?._id,
            items: books.map((book) => ({
              bookId: book._id,
              sellerId: book.ownerId,
              title: book.title,
              photo: book.photos[0],
              priceCents: offer ? offer.amountCents : book.priceCents,
            })),
            amountCents: books.reduce(
              (sum, book) => sum + (offer ? offer.amountCents : book.priceCents),
              0,
            ),
          },
        ],
        { session: dbSession },
      );
    });
  } finally {
    await dbSession.endSession();
  }
  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: order.items.map((item) => ({
          price_data: {
            currency: 'inr',
            unit_amount: item.priceCents,
            product_data: { name: item.title },
          },
          quantity: 1,
        })),
        success_url: config.frontendUrl + '/payment/success?orderId=' + orderId,
        cancel_url: config.frontendUrl + '/cart',
        shipping_address_collection: { allowed_countries: ['IN'] },
        metadata: { orderId: String(orderId) },
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      },
      { idempotencyKey: 'order-' + orderId },
    );
  } catch (error) {
    // Keep uncertain network failures reserved: a session may have been created remotely.
    // An operator can reconcile these orders using the idempotency key.
    if (error.type === 'StripeInvalidRequestError' || error.type === 'StripeAuthenticationError')
      await releaseOrder(orderId);
    throw error;
  }
  await Order.updateOne(
    { _id: orderId },
    { stripeSessionId: session.id, checkoutUrl: session.url },
  );
  res.json({ url: session.url, sessionId: session.id, orderId });
}
async function releaseOrder(id) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);
      if (!order || order.status !== 'pending') return;
      await Book.updateMany(
        { reservationId: String(id), status: 'reserved' },
        {
          $set: order.offerId ? { reservationId: String(order.offerId) } : { status: 'available' },
          ...(order.offerId ? {} : { $unset: { reservationId: 1 } }),
        },
        { session },
      );
      order.status = 'expired';
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }
}
exports.createCheckout = wrap((req, res) => checkout(req, res, true));
exports.createCartCheckout = wrap((req, res) => checkout(req, res, false));
exports.handleWebhook = async (req, res) => {
  if (!stripe || !config.stripeWebhookSecret) fail(503, 'Webhook not configured');
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      config.stripeWebhookSecret,
    );
  } catch {
    fail(400, 'Invalid webhook signature');
  }
  const payment = event.data.object;
  if (
    event.type === 'checkout.session.expired' ||
    event.type === 'checkout.session.async_payment_failed'
  ) {
    if (payment.metadata?.orderId) await releaseOrder(payment.metadata.orderId);
  }
  if (
    ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(
      event.type,
    ) &&
    payment.payment_status === 'paid'
  ) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(payment.metadata?.orderId).session(session);
        if (!order) fail(404, 'Order not found');
        if (order.status === 'paid') return;
        if (
          order.status !== 'pending' ||
          (order.stripeSessionId && order.stripeSessionId !== payment.id) ||
          payment.amount_total !== order.amountCents ||
          payment.currency !== 'inr'
        )
          fail(409, 'Payment does not match order');
        const result = await Book.updateMany(
          { reservationId: String(order._id), status: 'reserved' },
          { $set: { status: 'sold' }, $unset: { reservationId: 1 } },
          { session },
        );
        if (result.modifiedCount !== order.items.length)
          fail(409, 'Order inventory requires reconciliation');
        order.status = 'paid';
        order.stripeSessionId = payment.id;
        order.shipping = payment.shipping_details;
        await order.save({ session });
        if (order.offerId)
          await Offer.updateOne(
            { _id: order.offerId },
            { paymentCompleted: true, stripeSessionId: payment.id },
            { session },
          );
        await Offer.updateMany(
          { listingId: { $in: order.items.map((item) => item.bookId) }, status: 'pending' },
          { status: 'declined' },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
  }
  res.json({ received: true });
};
exports.getPaymentStatus = wrap(async (req, res) => {
  const offer = await Offer.findOne({ _id: req.params.offerId, proposerId: req.user.userId });
  if (!offer) fail(404, 'Offer not found');
  res.json({ offerStatus: offer.status, paymentCompleted: offer.paymentCompleted });
});
