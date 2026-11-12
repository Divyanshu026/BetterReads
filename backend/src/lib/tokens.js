// Pure, model-agnostic helpers for single-use email tokens (verify / reset) and
// for hashing opaque refresh tokens. We never store a raw token: the client
// holds the random secret, the database holds only its SHA-256 hash, so a leak
// of the database cannot be replayed. Mirrors the injected-dependency style of
// lib/username.js (the Mongoose model is passed in, not imported here).
const crypto = require('crypto');

// 32 random bytes rendered as URL-safe-ish hex: safe to embed in a link.
const randomToken = () => crypto.randomBytes(32).toString('hex');

// Deterministic one-way hash used for lookup and comparison.
const hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');

// Create a single-use token row and return the RAW token (shown once, emailed
// to the user). Only the hash is persisted.
async function issueToken(Model, { userId, type, ttlMs }) {
  const raw = randomToken();
  await Model.create({
    userId,
    type,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return raw;
}

// A 6-digit numeric code (zero-padded) for typed email verification. Uses a
// uniform CSPRNG draw so every value 000000–999999 is equally likely.
const randomCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

// Max wrong code guesses before the code is burned (defends the small 6-digit
// space together with per-route rate limiting and the short expiry).
const MAX_CODE_ATTEMPTS = 5;

// Issue a verification token that carries BOTH a link token (opaque, for the
// emailed link) and a typed 6-digit code, in one row with one expiry. Returns
// the raw link token and the plain code; only their hashes are stored. Any
// earlier unused verify tokens for this user are cleared so only the newest
// code is valid.
async function issueVerification(Model, { userId, ttlMs, codeTtlMs }) {
  const raw = randomToken();
  const code = randomCode();
  await Model.deleteMany({ userId, type: 'verify', usedAt: { $exists: false } });
  await Model.create({
    userId,
    type: 'verify',
    tokenHash: hashToken(raw),
    codeHash: hashToken(code),
    // The link lives for ttlMs; the typed code expires sooner (codeTtlMs).
    codeExpiresAt: new Date(Date.now() + (codeTtlMs || ttlMs)),
    attempts: 0,
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return { raw, code };
}

// Verify a typed code for a specific user. Looked up by userId (a 6-digit code
// is not globally unique), then compared by hash. Wrong guesses increment an
// attempt counter and the code is burned once the cap is hit. Returns
// { ok, userId } on success, or { ok:false, reason } otherwise.
async function consumeCode(Model, { userId, type, code }) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim()))
    return { ok: false, reason: 'Enter the 6-digit code from your email.' };
  const row = await Model.findOne({
    userId,
    type,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  // The typed code expires on its own shorter clock (codeExpiresAt).
  if (!row || !row.codeHash || (row.codeExpiresAt && row.codeExpiresAt <= new Date()))
    return { ok: false, reason: 'This code has expired. Request a new one.' };
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    await Model.updateOne({ _id: row._id }, { $set: { usedAt: new Date() } });
    return { ok: false, reason: 'Too many incorrect attempts. Request a new code.' };
  }
  if (hashToken(code.trim()) !== row.codeHash) {
    const attempts = row.attempts + 1;
    const burned = attempts >= MAX_CODE_ATTEMPTS;
    await Model.updateOne(
      { _id: row._id },
      burned ? { $set: { attempts, usedAt: new Date() } } : { $set: { attempts } },
    );
    return {
      ok: false,
      reason: burned
        ? 'Too many incorrect attempts. Request a new code.'
        : 'That code is incorrect. Please check and try again.',
    };
  }
  await Model.updateOne({ _id: row._id }, { $set: { usedAt: new Date() } });
  return { ok: true, userId: row.userId };
}

// Atomically consume a valid token: it must match the hash + type, be unused,
// and not expired. Marks it used in the same update so it cannot be replayed.
// Returns the consumed document (with userId) or null if invalid/expired/used.
async function consumeToken(Model, { raw, type }) {
  if (typeof raw !== 'string' || !raw) return null;
  return Model.findOneAndUpdate(
    {
      tokenHash: hashToken(raw),
      type,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { new: true },
  );
}

module.exports = {
  randomToken,
  randomCode,
  hashToken,
  issueToken,
  issueVerification,
  consumeCode,
  consumeToken,
  MAX_CODE_ATTEMPTS,
};
