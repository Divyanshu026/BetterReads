process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';

// Verify Google ID tokens deterministically: a credential of the form
// "token:<sub>:<email>" resolves to a verified profile, so we can exercise the
// OAuth onboarding and returning-user paths without real Google keys.
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
const { suggestUsername, usernameError, normalizeUsername } = require('../src/lib/username');

let database;
beforeAll(async () => {
  database = await MongoMemoryServer.create({ binary: { version: '7.0.24' } });
  await mongoose.connect(database.getUri());
  // Build indexes (including the unique username index) before we start.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});
afterAll(async () => {
  await mongoose.disconnect();
  if (database) await database.stop();
});
afterEach(async () => {
  await User.deleteMany({});
});

const register = (body) => request(app).post('/api/auth/register').send(body);
const google = (sub, email, name) =>
  request(app).post('/api/auth/google').send({ credential: `token:${sub}:${email}:${name || ''}` });

describe('username rules (shared library)', () => {
  test('rejects reserved, too-short, and malformed handles', () => {
    expect(usernameError('admin')).toMatch(/reserved/i);
    expect(usernameError('ab')).toMatch(/at least/i);
    expect(usernameError('bad name')).toMatch(/letters, numbers/i);
    expect(usernameError('.leading')).toMatch(/start or end/i);
    expect(usernameError('a_b.c')).toBe(''); // single separators allowed
    expect(usernameError('a__b')).toMatch(/two dots or underscores/i);
    expect(usernameError('a..b')).toMatch(/two dots or underscores/i);
  });
  test('normalizes case and leading @', () => {
    expect(normalizeUsername(' @Divyanshu ')).toBe('divyanshu');
  });
  test('suggestUsername avoids taken handles', async () => {
    const taken = new Set(['divyanshu']);
    const exists = async (name) => taken.has(name);
    const suggestion = await suggestUsername('Divyanshu', exists);
    expect(suggestion).not.toBe('divyanshu');
    expect(suggestion.startsWith('divyanshu')).toBe(true);
    expect(usernameError(suggestion)).toBe('');
  });
});

describe('email/password signup', () => {
  test('generates a readable username when none is given', async () => {
    const res = await register({ email: 'div@example.com', password: 'reader-password', name: 'Divyanshu' });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toMatch(/^divyanshu/);
    expect(res.body.created).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('accepts and enforces an explicit username', async () => {
    const res = await register({ email: 'a@example.com', password: 'reader-password', name: 'A', username: 'ReadWell' });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('readwell');
  });

  test('rejects an invalid explicit username with 400', async () => {
    const res = await register({ email: 'b@example.com', password: 'reader-password', name: 'B', username: 'admin' });
    expect(res.status).toBe(400);
  });

  test('rejects a taken explicit username with 409', async () => {
    await register({ email: 'c@example.com', password: 'reader-password', name: 'C', username: 'sharedname' });
    const res = await register({ email: 'd@example.com', password: 'reader-password', name: 'D', username: 'SharedName' });
    expect(res.status).toBe(409);
  });

  test('two signups from the same display name get distinct usernames', async () => {
    const first = await register({ email: 'e1@example.com', password: 'reader-password', name: 'Priya Sharma' });
    const second = await register({ email: 'e2@example.com', password: 'reader-password', name: 'Priya Sharma' });
    expect(first.body.user.username).toBeTruthy();
    expect(second.body.user.username).toBeTruthy();
    expect(first.body.user.username).not.toBe(second.body.user.username);
  });

  test('concurrent signups for the same name never collide (DB unique index)', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        register({ email: `rush${i}@example.com`, password: 'reader-password', name: 'Rush Reader' }),
      ),
    );
    results.forEach((res) => expect(res.status).toBe(201));
    const names = results.map((res) => res.body.user.username);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('username availability + onboarding endpoints', () => {
  test('availability reports taken and invalid handles', async () => {
    await register({ email: 'f@example.com', password: 'reader-password', name: 'F', username: 'takenhandle' });
    const taken = await request(app).get('/api/auth/username/available?username=TakenHandle');
    expect(taken.body).toMatchObject({ valid: true, available: false });
    const free = await request(app).get('/api/auth/username/available?username=freehandle');
    expect(free.body).toMatchObject({ valid: true, available: true });
    const invalid = await request(app).get('/api/auth/username/available?username=ab');
    expect(invalid.body).toMatchObject({ valid: false, available: false });
  });

  test('claim requires auth and enforces uniqueness', async () => {
    const owner = await register({ email: 'g@example.com', password: 'reader-password', name: 'G', username: 'ownerhandle' });
    const other = await register({ email: 'h@example.com', password: 'reader-password', name: 'H' });
    const auth = { Authorization: `Bearer ${other.body.token}` };

    expect((await request(app).patch('/api/auth/username').send({ username: 'anything' })).status).toBe(401);

    const taken = await request(app).patch('/api/auth/username').set(auth).send({ username: 'OwnerHandle' });
    expect(taken.status).toBe(409);

    const ok = await request(app).patch('/api/auth/username').set(auth).send({ username: 'brandnew' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.username).toBe('brandnew');

    // Owner re-saving their own handle is idempotent, not a conflict.
    const idem = await request(app)
      .patch('/api/auth/username')
      .set({ Authorization: `Bearer ${owner.body.token}` })
      .send({ username: 'ownerhandle' });
    expect(idem.status).toBe(200);
  });
});

describe('OAuth onboarding and returning users', () => {
  test('first Google sign-in creates an account with a username and created flag', async () => {
    const res = await google('google-sub-1', 'newg@example.com', 'New Googler');
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(true);
    expect(res.body.user.username).toMatch(/^newgoogler/);
  });

  test('returning Google user signs in without being treated as new', async () => {
    await google('google-sub-2', 'ret@example.com', 'Returner');
    const again = await google('google-sub-2', 'ret@example.com', 'Returner');
    expect(again.status).toBe(200);
    expect(again.body.created).toBe(false);
  });

  test('existing email account links to Google and keeps its username', async () => {
    const existing = await register({ email: 'link@example.com', password: 'reader-password', name: 'Linker', username: 'linkerhandle' });
    const linked = await google('google-sub-3', 'link@example.com', 'Linker');
    expect(linked.status).toBe(200);
    expect(linked.body.created).toBe(false);
    expect(linked.body.user.username).toBe('linkerhandle');
    expect(String(linked.body.user.id)).toBe(String(existing.body.user.id));
  });
});

describe('username migration backfill', () => {
  test('assigns unique usernames only to accounts missing one, and is repeatable', async () => {
    // Simulate legacy users created before usernames existed.
    await User.collection.insertMany([
      { email: 'old1@example.com', name: 'Old One', createdAt: new Date(), updatedAt: new Date() },
      { email: 'old2@example.com', name: 'Old One', createdAt: new Date(), updatedAt: new Date() },
      { email: 'keep@example.com', name: 'Keeper', username: 'keeperhandle', createdAt: new Date(), updatedAt: new Date() },
    ]);

    const reserved = new Set();
    const exists = async (username) => reserved.has(username) || Boolean(await User.exists({ username }));
    const legacy = await User.find({ username: { $in: [null, undefined] } });
    for (const doc of legacy) {
      if (doc.username) continue;
      const username = await suggestUsername(doc.name || doc.email, exists);
      reserved.add(username);
      await User.updateOne({ _id: doc._id, username: { $in: [null, undefined] } }, { $set: { username } });
    }

    const refreshed = await User.find({}).select('email username');
    const byEmail = Object.fromEntries(refreshed.map((u) => [u.email, u.username]));
    expect(byEmail['keep@example.com']).toBe('keeperhandle'); // untouched
    expect(byEmail['old1@example.com']).toBeTruthy();
    expect(byEmail['old2@example.com']).toBeTruthy();
    expect(byEmail['old1@example.com']).not.toBe(byEmail['old2@example.com']);

    // Running again assigns nothing new (repeatable / collision-safe).
    const remaining = await User.countDocuments({ username: { $in: [null, undefined] } });
    expect(remaining).toBe(0);
  });
});
