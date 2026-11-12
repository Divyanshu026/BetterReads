process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
// Keep the access token short so we can prove the refresh path, but not so
// short that it expires mid-request.
process.env.ACCESS_TOKEN_TTL = '2s';

// Capture the links the app would email instead of sending real mail. Each call
// pushes { to, type, link } so tests can pull the latest verify/reset link.
const sentMail = [];
jest.mock('../src/services/mailer', () => ({
  sendVerificationEmail: async (user, link, code) => { sentMail.push({ to: user.email, type: 'verify', link, code }); },
  sendPasswordResetEmail: async (user, link) => { sentMail.push({ to: user.email, type: 'reset', link }); },
}));

// Resolve a fake "token:<sub>:<email>:<name>" credential to a verified Google
// profile, matching the convention used in auth.test.js, so Google sign-in can
// be exercised without real Google keys.
jest.mock('../src/services/google', () => ({
  verifyGoogleIdToken: async (credential) => {
    const [, sub, email, name] = String(credential).split(':');
    return { sub, email, emailVerified: true, name: name || '', picture: '' };
  },
}));

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Session = require('../src/models/Session');
const Token = require('../src/models/Token');

let database;
beforeAll(async () => {
  database = await MongoMemoryServer.create({ binary: { version: '7.0.24' } });
  await mongoose.connect(database.getUri());
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});
afterAll(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
});
afterEach(async () => {
  sentMail.length = 0;
  await Promise.all([User.deleteMany({}), Session.deleteMany({}), Token.deleteMany({})]);
});

const agent = () => request.agent(app); // keeps cookies between calls
const register = (client, body) =>
  client.post('/api/auth/register').send({ name: 'Reader', password: 'password123', ...body });

// Pull the token out of the most recent captured link of a given type.
const tokenFromLink = (type) => {
  const entry = [...sentMail].reverse().find((m) => m.type === type);
  return entry ? new URL(entry.link).searchParams.get('token') : null;
};
// The 6-digit code from the most recent verification email.
const latestCode = () => [...sentMail].reverse().find((m) => m.type === 'verify')?.code;
// Did a Set-Cookie header set this cookie to a non-empty value?
const setsCookie = (res, name) =>
  (res.headers['set-cookie'] || []).some((c) => new RegExp(`^${name}=[^;]+`).test(c) && !c.includes(`${name}=;`));

describe('registration + email verification', () => {
  test('register sets auth cookies, is unverified, and emails a verify link', async () => {
    const res = await register(agent(), { email: 'new@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.user.emailVerified).toBe(false);
    expect(res.body.created).toBe(true);
    expect(typeof res.body.token).toBe('string'); // dual-transport: body token still present
    expect(setsCookie(res, 'br_access')).toBe(true);
    expect(setsCookie(res, 'br_refresh')).toBe(true);
    expect(sentMail.find((m) => m.type === 'verify' && m.to === 'new@example.com')).toBeTruthy();
  });

  test('a valid verify link marks the account verified; reuse fails', async () => {
    await register(agent(), { email: 'verify@example.com' });
    const token = tokenFromLink('verify');
    const ok = await request(app).get(`/api/auth/verify-email?token=${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.user.emailVerified).toBe(true);
    expect((await User.findOne({ email: 'verify@example.com' })).emailVerified).toBe(true);
    // Single-use: the same link cannot be replayed.
    const again = await request(app).get(`/api/auth/verify-email?token=${token}`);
    expect(again.status).toBe(400);
  });

  test('an invalid verify token is rejected', async () => {
    const res = await request(app).get('/api/auth/verify-email?token=not-a-real-token');
    expect(res.status).toBe(400);
  });

  test('the typed 6-digit code verifies the signed-in account', async () => {
    const client = agent();
    await register(client, { email: 'code@example.com' });
    const code = latestCode();
    expect(code).toMatch(/^\d{6}$/);
    const res = await client.post('/api/auth/verify-code').send({ code });
    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).toBe(true);
    expect((await User.findOne({ email: 'code@example.com' })).emailVerified).toBe(true);
  });

  test('a wrong code fails, and the code is burned after too many attempts', async () => {
    const client = agent();
    await register(client, { email: 'wrong@example.com' });
    const realCode = latestCode();
    const bad = realCode === '000000' ? '111111' : '000000';
    // Five wrong guesses: first four are "incorrect", the fifth hits the cap.
    for (let i = 0; i < 5; i += 1) {
      const res = await client.post('/api/auth/verify-code').send({ code: bad });
      expect(res.status).toBe(400);
    }
    // Even the correct code no longer works once burned.
    const after = await client.post('/api/auth/verify-code').send({ code: realCode });
    expect(after.status).toBe(400);
    expect((await User.findOne({ email: 'wrong@example.com' })).emailVerified).toBe(false);
  });

  test('verify-code requires authentication and rejects a malformed code', async () => {
    const anon = await request(app).post('/api/auth/verify-code').send({ code: '123456' });
    expect(anon.status).toBe(401);
    const client = agent();
    await register(client, { email: 'malformed@example.com' });
    const res = await client.post('/api/auth/verify-code').send({ code: 'abc' });
    expect(res.status).toBe(400);
  });

  test('resending issues a fresh code and invalidates the previous one', async () => {
    const client = agent();
    await register(client, { email: 'resend@example.com' });
    const firstCode = latestCode();
    const resent = await client.post('/api/auth/resend-verification');
    expect(resent.status).toBe(200);
    const secondCode = latestCode();
    // The old code is now invalid; the new one works.
    const oldTry = await client.post('/api/auth/verify-code').send({ code: firstCode });
    if (firstCode !== secondCode) expect(oldTry.status).toBe(400);
    const newTry = await client.post('/api/auth/verify-code').send({ code: secondCode });
    expect(newTry.status).toBe(200);
  });
});

describe('login + refresh rotation', () => {
  test('login issues cookies and refresh rotates the token (old one is rejected)', async () => {
    await register(agent(), { email: 'rot@example.com' });
    const client = agent();
    const login = await client.post('/api/auth/login').send({ email: 'rot@example.com', password: 'password123' });
    expect(login.status).toBe(200);
    expect(setsCookie(login, 'br_refresh')).toBe(true);

    // Capture the first refresh cookie, rotate once, then try to reuse the old one.
    const firstRefresh = (login.headers['set-cookie'] || []).find((c) => c.startsWith('br_refresh='));
    const rotated = await client.post('/api/auth/refresh');
    expect(rotated.status).toBe(200);
    expect(setsCookie(rotated, 'br_refresh')).toBe(true);

    // Present the original (now-rotated-away) refresh token directly: no match.
    const stale = firstRefresh.split(';')[0];
    const reused = await request(app).post('/api/auth/refresh').set('Cookie', stale);
    expect(reused.status).toBe(401);
  });

  test('refresh without a session cookie is unauthorized', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('logout + logout-all', () => {
  test('logout revokes the current session', async () => {
    const client = agent();
    await register(client, { email: 'out@example.com' });
    expect(await Session.countDocuments()).toBe(1);
    const res = await client.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(await Session.countDocuments()).toBe(0);
  });

  test('logout-all revokes every session for the user', async () => {
    // Two independent logins => two sessions.
    await register(agent(), { email: 'all@example.com' });
    const a = agent();
    await a.post('/api/auth/login').send({ email: 'all@example.com', password: 'password123' });
    const b = agent();
    await b.post('/api/auth/login').send({ email: 'all@example.com', password: 'password123' });
    expect(await Session.countDocuments()).toBeGreaterThanOrEqual(2);
    const res = await a.post('/api/auth/logout-all');
    expect(res.status).toBe(200);
    expect(await Session.countDocuments()).toBe(0);
  });
});

describe('forgot + reset password', () => {
  test('forgot-password always returns 200 and does not reveal existence', async () => {
    await register(agent(), { email: 'known@example.com' });
    const known = await request(app).post('/api/auth/forgot-password').send({ email: 'known@example.com' });
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(tokenFromLink('reset')).toBeTruthy(); // emailed only for the real account
    expect(sentMail.filter((m) => m.to === 'nobody@example.com')).toHaveLength(0);
  });

  test('reset sets a new password, verifies the email, and revokes sessions', async () => {
    const client = agent();
    await register(client, { email: 'reset@example.com', password: 'password123' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'reset@example.com' });
    const token = tokenFromLink('reset');
    const res = await request(app).post('/api/auth/reset-password').send({ token, password: 'brand-new-pass' });
    expect(res.status).toBe(200);
    // All sessions revoked by the reset.
    expect(await Session.countDocuments()).toBe(0);
    // Old password no longer works; new one does.
    const oldLogin = await request(app).post('/api/auth/login').send({ email: 'reset@example.com', password: 'password123' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/auth/login').send({ email: 'reset@example.com', password: 'brand-new-pass' });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.emailVerified).toBe(true);
  });

  test('a short reset password is rejected', async () => {
    await register(agent(), { email: 'short@example.com' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'short@example.com' });
    const token = tokenFromLink('reset');
    const res = await request(app).post('/api/auth/reset-password').send({ token, password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('soft verification gate', () => {
  test('an unverified user is blocked from a sensitive action, then allowed after verifying', async () => {
    const client = agent();
    await register(client, { email: 'gate@example.com' });
    // Creating a chat is gated behind requireVerified.
    const blocked = await client.post('/api/chats').send({ participantId: '507f1f77bcf86cd799439011' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('EMAIL_NOT_VERIFIED');

    // Verify, then the gate opens (the 507f… participant won't exist, so we
    // expect a normal 4xx from the handler — crucially NOT the 403 gate).
    const token = tokenFromLink('verify');
    await request(app).get(`/api/auth/verify-email?token=${token}`);
    const after = await client.post('/api/chats').send({ participantId: '507f1f77bcf86cd799439011' });
    expect(after.status).not.toBe(403);
  });
});

describe('Google sign-in', () => {
  test('arrives already verified and can use sensitive actions', async () => {
    const client = agent();
    const res = await client
      .post('/api/auth/google')
      .send({ credential: 'token:g-123:gmail@example.com:Gee' });
    expect(res.status).toBe(201);
    expect(res.body.user.emailVerified).toBe(true);
    const chat = await client.post('/api/chats').send({ participantId: '507f1f77bcf86cd799439011' });
    expect(chat.status).not.toBe(403);
  });
});
