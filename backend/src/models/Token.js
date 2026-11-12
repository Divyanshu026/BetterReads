const mongoose = require('mongoose');

// Single-use email tokens: email verification and password reset. Only the
// hash of the random token is stored; the raw value lives only in the emailed
// link. `usedAt` marks consumption so a link cannot be replayed, and the TTL
// index purges expired rows automatically.
const TokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['verify', 'reset'], required: true },
    tokenHash: { type: String, required: true, index: true },
    // Hash of a typed 6-digit code (verify tokens only). The code and the link
    // share one row but expire independently: the code is short-lived
    // (codeExpiresAt), while the emailed link stays valid until expiresAt.
    codeHash: { type: String },
    // Separate, shorter expiry for the typed code.
    codeExpiresAt: { type: Date },
    // Wrong-guess counter for the typed code; the code is burned at the cap.
    attempts: { type: Number, default: 0 },
    usedAt: { type: Date },
    // Row-level expiry (drives the TTL index and the emailed link's validity).
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Token', TokenSchema);
