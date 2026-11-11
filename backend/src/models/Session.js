const mongoose = require('mongoose');

// A refresh session: one row per active login. The opaque refresh token is
// stored only as a SHA-256 hash (never raw). Rotating the token on every
// refresh lets us detect reuse of a stolen token, and a row can be revoked to
// implement "log out" and "log out everywhere".
const SessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // SHA-256 of the current refresh token for this session. Rotated on refresh.
    tokenHash: { type: String, required: true, index: true },
    // Best-effort client metadata so a user can recognize sessions in a list.
    userAgent: { type: String, maxlength: 400 },
    ip: { type: String, maxlength: 60 },
    lastUsedAt: { type: Date, default: Date.now },
    // Set when the session is revoked (logout / rotation / reuse detection).
    revokedAt: { type: Date },
    // Absolute expiry. The TTL index below purges the row once it passes.
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index: MongoDB removes the document shortly after `expiresAt`.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', SessionSchema);
