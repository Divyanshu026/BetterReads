// Repeatable, collision-safe migration that gives every account a unique
// username. Users that already have one are left untouched, so running it
// twice is safe. It only writes the `username` field and never alters other
// profile data.
//
//   node src/scripts/backfill-usernames.js          # apply
//   node src/scripts/backfill-usernames.js --dry-run # report only
//
// Requires MONGO_URI in the environment (same as the server).
const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const { suggestUsername } = require('../lib/username');

async function run({ dryRun }) {
  if (!config.mongoUri) throw new Error('MONGO_URI is not set in environment');
  await mongoose.connect(config.mongoUri);
  // Make sure the unique index exists before we start assigning handles.
  await User.init();

  // In-process reservation set guards against two generated handles colliding
  // within this run; the DB unique index is the ultimate guard across runs.
  const reserved = new Set();
  const exists = async (username) =>
    reserved.has(username) || Boolean(await User.exists({ username }));

  const cursor = User.find({
    $or: [{ username: { $exists: false } }, { username: null }, { username: '' }],
  })
    .select('name email username')
    .cursor();

  let assigned = 0;
  let skipped = 0;
  for (let user = await cursor.next(); user; user = await cursor.next()) {
    if (user.username) {
      skipped += 1;
      continue;
    }
    const username = await suggestUsername(user.name || user.email, exists);
    reserved.add(username);
    if (dryRun) {
      console.log(`[dry-run] ${user.email} -> @${username}`);
      assigned += 1;
      continue;
    }
    try {
      // Only set when still empty, so a concurrent run can't double-assign.
      const result = await User.updateOne(
        { _id: user._id, $or: [{ username: { $exists: false } }, { username: null }, { username: '' }] },
        { $set: { username } },
      );
      if (result.modifiedCount === 1) {
        assigned += 1;
        console.log(`${user.email} -> @${username}`);
      } else {
        skipped += 1;
        reserved.delete(username);
      }
    } catch (err) {
      // A racing writer took this handle: release it and let a later run retry.
      if (err.code === 11000) {
        reserved.delete(username);
        skipped += 1;
        console.warn(`Skipped ${user.email}: @${username} was just taken; re-run to retry.`);
      } else {
        throw err;
      }
    }
  }

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Done. ${assigned} username(s) ${dryRun ? 'would be ' : ''}assigned, ${skipped} skipped.`,
  );
  await mongoose.disconnect();
}

run({ dryRun: process.argv.includes('--dry-run') }).catch(async (err) => {
  console.error('Backfill failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
