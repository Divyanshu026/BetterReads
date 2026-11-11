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

module.exports = { randomToken, hashToken, issueToken, consumeToken };
