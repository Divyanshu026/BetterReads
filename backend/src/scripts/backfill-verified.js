// One-time, repeatable migration that grandfathers existing Google-linked
// accounts as email-verified. Google asserts a verified email at sign-in, so a
// returning Google user predating the verification feature should not be gated.
// Password accounts are intentionally left unverified: they must confirm their
// address through the normal verify flow.
//
//   node src/scripts/backfill-verified.js           # apply
//   node src/scripts/backfill-verified.js --dry-run # report only
//
// Running it twice is safe — accounts already verified are skipped. It only
// writes `emailVerified`/`emailVerifiedAt` and never alters other data.
// Requires MONGO_URI in the environment (same as the server).
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');

// Google-linked accounts that are not already verified.
const query = {
  googleId: { $exists: true, $ne: null },
  emailVerified: { $ne: true },
};

async function run({ dryRun }) {
  if (!config.mongoUri) throw new Error('MONGO_URI is not set in environment');
  await mongoose.connect(config.mongoUri);

  const pending = await User.countDocuments(query);
  if (dryRun) {
    const cursor = User.find(query).select('email').cursor();
    for (let user = await cursor.next(); user; user = await cursor.next()) {
      console.log(`[dry-run] ${user.email} -> emailVerified`);
    }
    console.log(`[dry-run] Done. ${pending} Google account(s) would be marked verified.`);
    await mongoose.disconnect();
    return;
  }

  const result = await User.updateMany(query, {
    $set: { emailVerified: true, emailVerifiedAt: new Date() },
  });
  console.log(`Done. ${result.modifiedCount} Google account(s) marked verified.`);
  await mongoose.disconnect();
}

run({ dryRun: process.argv.includes('--dry-run') }).catch(async (err) => {
  console.error('Backfill failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
