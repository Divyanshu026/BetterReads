process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
process.env.STRIPE_SECRET_KEY = 'sk_test_local_testing_only';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_testing_only';
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { io: client } = require('../../frontend/node_modules/socket.io-client');
const http = require('http');
const app = require('../src/app');
const { stripe } = require('../src/services/stripe');
const Book = require('../src/models/Book');
const Order = require('../src/models/Order');
const User = require('../src/models/User');
let db, seller, buyer, stranger, server, sockets, baseUrl;
const auth = (user) => ({ Authorization: 'Bearer ' + user.token });
const book = async (owner, overrides = {}) => {
  const res = await request(app)
    .post('/api/books')
    .set(auth(owner))
    .send({
      title: 'A Book',
      author: 'A Reader',
      priceCents: 25000,
      genre: 'Fiction',
      city: 'Delhi',
      barterAvailable: true,
      ...overrides,
    });
  expect(res.status).toBe(201);
  return res.body;
};
const signedEvent = async (order, type = 'checkout.session.completed', extra = {}) => {
  const payload = JSON.stringify({
    id: 'evt_' + order._id,
    type,
    data: {
      object: {
        id: order.stripeSessionId,
        metadata: { orderId: String(order._id) },
        payment_status: 'paid',
        amount_total: order.amountCents,
        currency: 'inr',
        ...extra,
      },
    },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  return request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', signature)
    .send(payload);
};
beforeAll(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.24' } });
  await mongoose.connect(db.getUri());
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  for (const name of ['seller', 'buyer', 'stranger']) {
    const r = await request(app)
      .post('/api/auth/register')
      .send({ email: name + '@example.com', password: 'reader-password', name });
    expect(r.status).toBe(201);
    if (name === 'seller') seller = r.body;
    else if (name === 'buyer') buyer = r.body;
    else stranger = r.body;
  }
  let counter = 0;
  jest.spyOn(stripe.checkout.sessions, 'create').mockImplementation(async () => ({
    id: 'cs_test_' + ++counter,
    url: 'https://checkout.stripe.com/test-session',
  }));
  server = http.createServer(app);
  sockets = require('../src/sockets').initSockets(server);
  app.set('io', sockets);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = 'http://127.0.0.1:' + server.address().port;
}, 120000);
afterAll(async () => {
  await new Promise((resolve) => sockets?.close(resolve));
  await mongoose.disconnect();
  await db?.stop();
});
test('authentication validates inputs, normalizes email, and restores sessions', async () => {
  expect(
    (await request(app).post('/api/auth/register').send({ email: 'x', password: 'short' })).status,
  ).toBe(400);
  const r = await request(app)
    .post('/api/auth/login')
    .send({ email: ' SELLER@example.com ', password: 'reader-password' });
  expect(r.status).toBe(200);
  expect((await request(app).get('/api/auth/me').set(auth(seller))).body.user.id).toBe(
    seller.user.id,
  );
  expect((await request(app).get('/api/auth/me')).status).toBe(401);
});
test('profiles cannot modify roles, password hashes, or reputation; public profile omits email', async () => {
  await request(app)
    .patch('/api/users/' + buyer.user.id)
    .set(auth(buyer))
    .send({ role: 'admin', passwordHash: 'bad', reputation: { score: 5 }, name: 'Buyer' });
  const actual = await User.findById(buyer.user.id);
  expect(actual.role).toBe('user');
  expect(actual.passwordHash).not.toBe('bad');
  expect(actual.reputation.score).toBe(0);
  const r = await request(app).get('/api/users/' + buyer.user.id);
  expect(r.body.user.email).toBeUndefined();
  expect(r.body.user.passwordHash).toBeUndefined();
});
test('listings validate price and ignore ownership/status injection', async () => {
  const b = await book(seller, { ownerId: buyer.user.id, status: 'sold' });
  expect(b.ownerId).toBe(seller.user.id);
  expect(b.status).toBe('available');
  expect(
    (
      await request(app)
        .patch('/api/books/' + b._id)
        .set(auth(buyer))
        .send({ title: 'Stolen' })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .post('/api/books')
        .set(auth(seller))
        .send({ title: 'Invalid', priceCents: -1 })
    ).status,
  ).toBe(400);
  expect((await request(app).get('/api/books/not-an-id')).status).toBe(400);
});
test('search is literal, filters apply, and pagination reports totals', async () => {
  await book(seller, { title: 'The [Special] Story' });
  const r = await request(app)
    .get('/api/books')
    .query({ q: '[Special]', status: 'available', limit: 1 });
  expect(r.status).toBe(200);
  expect(r.body).toHaveLength(1);
  expect(r.headers['x-total-count']).toBe('1');
  const no = await request(app).get('/api/books').query({ status: 'sold', q: '[Special]' });
  expect(no.body).toHaveLength(0);
});
test('wishlist add is idempotent and removal persists', async () => {
  const b = await book(seller);
  for (let i = 0; i < 2; i++)
    expect(
      (
        await request(app)
          .post('/api/wishlist/' + b._id)
          .set(auth(buyer))
      ).status,
    ).toBe(200);
  expect((await request(app).get('/api/wishlist').set(auth(buyer))).body.wishlist).toHaveLength(1);
  await request(app)
    .delete('/api/wishlist/' + b._id)
    .set(auth(buyer));
  expect((await request(app).get('/api/wishlist').set(auth(buyer))).body.wishlist).toHaveLength(0);
});
test('offers are private; barter requires ownership of available offered books', async () => {
  const target = await book(seller),
    owned = await book(buyer),
    foreign = await book(stranger);
  expect(
    (
      await request(app)
        .post('/api/offers')
        .set(auth(buyer))
        .send({ listingId: target._id, type: 'barter', offeredBookIds: [foreign._id] })
    ).status,
  ).toBe(400);
  const offer = (
    await request(app)
      .post('/api/offers')
      .set(auth(buyer))
      .send({ listingId: target._id, type: 'barter', offeredBookIds: [owned._id] })
  ).body;
  expect(
    (
      await request(app)
        .get('/api/offers/' + offer._id)
        .set(auth(stranger))
    ).status,
  ).toBe(404);
  expect((await request(app).get('/api/offers').set(auth(stranger))).body).toHaveLength(0);
  expect(
    (
      await request(app)
        .patch('/api/offers/' + offer._id)
        .set(auth(seller))
        .send({ status: 'accepted' })
    ).status,
  ).toBe(200);
  expect((await Book.findById(target._id)).status).toBe('exchanged');
  expect((await Book.findById(owned._id)).status).toBe('exchanged');
});
test('cart rejects own books, duplicate IDs, and ignores client prices', async () => {
  const b = await book(seller);
  expect(
    (
      await request(app)
        .post('/api/payments/cart-checkout')
        .set(auth(seller))
        .send({ cartItems: [{ _id: b._id }] })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .post('/api/payments/cart-checkout')
        .set(auth(buyer))
        .send({ cartItems: [{ _id: b._id }, { _id: b._id }] })
    ).status,
  ).toBe(400);
  const r = await request(app)
    .post('/api/payments/cart-checkout')
    .set(auth(buyer))
    .send({ cartItems: [{ _id: b._id, priceCents: 1 }] });
  expect(r.status).toBe(200);
  const order = await Order.findById(r.body.orderId);
  expect(order.amountCents).toBe(25000);
  expect((await Book.findById(b._id)).status).toBe('reserved');
  expect(
    (
      await request(app)
        .get('/api/orders/' + order._id)
        .set(auth(stranger))
    ).status,
  ).toBe(404);
  expect(
    (
      await request(app)
        .post('/api/payments/cart-checkout')
        .set(auth(stranger))
        .send({ cartItems: [{ _id: b._id }] })
    ).status,
  ).toBe(409);
  expect((await signedEvent(order)).status).toBe(200);
  expect((await signedEvent(order)).status).toBe(200);
  expect((await Book.findById(b._id)).status).toBe('sold');
  expect((await Order.findById(order._id)).status).toBe('paid');
});
test('invalid signatures, unpaid sessions and mismatched totals cannot fulfill orders', async () => {
  const b = await book(seller),
    r = await request(app)
      .post('/api/payments/cart-checkout')
      .set(auth(buyer))
      .send({ cartItems: [{ _id: b._id }] }),
    order = await Order.findById(r.body.orderId);
  expect((await request(app).post('/api/payments/webhook').send({})).status).toBe(400);
  expect(
    (await signedEvent(order, 'checkout.session.completed', { payment_status: 'unpaid' })).status,
  ).toBe(200);
  expect((await Order.findById(order._id)).status).toBe('pending');
  expect((await signedEvent(order, 'checkout.session.completed', { amount_total: 1 })).status).toBe(
    409,
  );
  expect((await signedEvent(order, 'checkout.session.expired')).status).toBe(200);
  expect((await Book.findById(b._id)).status).toBe('available');
  expect((await Order.findById(order._id)).status).toBe('expired');
});
test('concurrent checkout requests reserve a single copy exactly once', async () => {
  const b = await book(seller);
  const result = await Promise.all(
    [buyer, stranger].map((u) =>
      request(app)
        .post('/api/payments/cart-checkout')
        .set(auth(u))
        .send({ cartItems: [{ _id: b._id }] }),
    ),
  );
  expect(result.map((r) => r.status).sort()).toEqual([200, 409]);
});
test('purchase offers reserve, can be paid, and become completed via webhook', async () => {
  const b = await book(seller);
  const o = (
    await request(app)
      .post('/api/offers')
      .set(auth(buyer))
      .send({ listingId: b._id, type: 'purchase', amountCents: 18000 })
  ).body;
  expect(
    (
      await request(app)
        .patch('/api/offers/' + o._id)
        .set(auth(seller))
        .send({ status: 'accepted' })
    ).status,
  ).toBe(200);
  const r = await request(app)
    .post('/api/payments/checkout')
    .set(auth(buyer))
    .send({ offerId: o._id });
  expect(r.status).toBe(200);
  const order = await Order.findById(r.body.orderId);
  expect(order.amountCents).toBe(18000);
  expect((await signedEvent(order)).status).toBe(200);
  expect(
    (
      await request(app)
        .get('/api/payments/status/' + o._id)
        .set(auth(buyer))
    ).body.paymentCompleted,
  ).toBe(true);
  expect(
    (await request(app).post('/api/payments/checkout').set(auth(buyer)).send({ offerId: o._id }))
      .status,
  ).toBe(409);
});
test('REST chat history, read markers and sends require participation', async () => {
  const c = (
    await request(app).post('/api/chats').set(auth(buyer)).send({ participantId: seller.user.id })
  ).body;
  expect(
    (
      await request(app)
        .get('/api/chats/' + c._id)
        .set(auth(stranger))
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .patch('/api/chats/' + c._id + '/read')
        .set(auth(stranger))
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .post('/api/chats/' + c._id + '/messages')
        .set(auth(stranger))
        .send({ text: 'Injected' })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .post('/api/chats/' + c._id + '/messages')
        .set(auth(buyer))
        .send({ text: '   ' })
    ).status,
  ).toBe(400);
  const r = await request(app)
    .post('/api/chats/' + c._id + '/messages')
    .set(auth(buyer))
    .send({ text: 'Hello, reader!' });
  expect(r.status).toBe(201);
  expect(r.body._id).toBeTruthy();
});
test('socket rooms reject outsiders and deliver persisted REST messages to members', async () => {
  const c = (
    await request(app).post('/api/chats').set(auth(buyer)).send({ participantId: seller.user.id })
  ).body;
  const outsider = client(baseUrl, { auth: { token: stranger.token }, transports: ['websocket'] }),
    member = client(baseUrl, { auth: { token: seller.token }, transports: ['websocket'] });
  try {
    await Promise.all(
      [outsider, member].map(
        (s) =>
          new Promise((resolve, reject) => {
            s.on('connect', resolve);
            s.on('connect_error', reject);
          }),
      ),
    );
    const denied = await outsider.timeout(3000).emitWithAck('join_chat', c._id);
    expect(denied.error).toBeTruthy();
    expect((await member.timeout(3000).emitWithAck('join_chat', c._id)).success).toBe(true);
    const received = new Promise((resolve) => member.once('message', resolve));
    await request(app)
      .post('/api/chats/' + c._id + '/messages')
      .set(auth(buyer))
      .send({ text: 'Live message' });
    expect((await received).message.text).toBe('Live message');
  } finally {
    outsider.disconnect();
    member.disconnect();
  }
});
test('uploads reject remote URLs, fake images, and deletion outside a user folder', async () => {
  expect(
    (
      await request(app)
        .post('/api/upload')
        .set(auth(buyer))
        .send({ image: 'https://example.com/private' })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .post('/api/upload')
        .set(auth(buyer))
        .send({ image: 'data:image/png;base64,aGVsbG8=' })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(app)
        .delete('/api/upload/betterreads/' + seller.user.id + '/image.png')
        .set(auth(buyer))
    ).status,
  ).toBe(403);
});
test('book reviews validate rating and are linked to the correct seller', async () => {
  const b = await book(seller);
  expect(
    (
      await request(app)
        .post('/api/reviews')
        .set(auth(buyer))
        .send({ bookId: b._id, revieweeId: stranger.user.id, rating: 5 })
    ).status,
  ).toBe(400);
  const r = await request(app)
    .post('/api/reviews')
    .set(auth(buyer))
    .send({ bookId: b._id, revieweeId: seller.user.id, rating: 4, comment: 'A thoughtful read.' });
  expect(r.status).toBe(201);
  expect(
    (await request(app).get('/api/reviews').query({ bookId: b._id })).body.reviews,
  ).toHaveLength(1);
  expect(
    (
      await request(app)
        .delete('/api/reviews/' + r.body._id)
        .set(auth(stranger))
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .delete('/api/reviews/' + r.body._id)
        .set(auth(buyer))
    ).status,
  ).toBe(200);
});

test('seller shipping and buyer delivery updates enforce roles and progression', async () => {
  const listing = await book(seller);
  const checkout = await request(app)
    .post('/api/payments/cart-checkout')
    .set(auth(buyer))
    .send({ cartItems: [{ _id: listing._id }] });
  const order = await Order.findById(checkout.body.orderId);
  await signedEvent(order);
  const path = '/api/orders/' + order._id + '/items/' + listing._id;
  expect(
    (await request(app).patch(path).set(auth(buyer)).send({ fulfillment: 'shipped' })).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .patch(path)
        .set(auth(seller))
        .send({ fulfillment: 'shipped', tracking: 'TRACK-123' })
    ).status,
  ).toBe(200);
  expect(
    (await request(app).patch(path).set(auth(stranger)).send({ fulfillment: 'delivered' })).status,
  ).toBe(409);
  expect(
    (await request(app).patch(path).set(auth(buyer)).send({ fulfillment: 'delivered' })).status,
  ).toBe(200);
  expect((await Order.findById(order._id)).items[0].fulfillment).toBe('delivered');
  const sales = await request(app).get('/api/orders?view=sales').set(auth(seller));
  expect(sales.body.some((o) => o._id === String(order._id))).toBe(true);
});
test('an accepted unpaid offer can be cancelled before checkout to release inventory', async () => {
  const listing = await book(seller);
  const offer = (
    await request(app)
      .post('/api/offers')
      .set(auth(buyer))
      .send({ listingId: listing._id, type: 'purchase', amountCents: 20000 })
  ).body;
  await request(app)
    .patch('/api/offers/' + offer._id)
    .set(auth(seller))
    .send({ status: 'accepted' });
  expect(
    (
      await request(app)
        .delete('/api/offers/' + offer._id)
        .set(auth(stranger))
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .delete('/api/offers/' + offer._id)
        .set(auth(buyer))
    ).status,
  ).toBe(200);
  expect((await Book.findById(listing._id)).status).toBe('available');
});

test('valid image uploads stay in the authenticated namespace and can be deleted', async () => {
  const png =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD6kAAAAASUVORK5CYII=';
  const r = await request(app)
    .post('/api/upload')
    .set(auth(buyer))
    .send({ image: png, folder: '../../outside' });
  expect(r.status).toBe(200);
  expect(r.body.publicId.startsWith('betterreads/' + buyer.user.id + '/')).toBe(true);
  expect((await request(app).get(r.body.url)).status).toBe(200);
  expect(
    (
      await request(app)
        .delete('/api/upload/' + r.body.publicId)
        .set(auth(stranger))
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .delete('/api/upload/' + r.body.publicId)
        .set(auth(buyer))
    ).status,
  ).toBe(200);
  expect((await request(app).get(r.body.url)).status).toBe(404);
});
