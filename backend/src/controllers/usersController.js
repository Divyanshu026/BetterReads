const User = require('../models/User');
const { wrap, fail, pick } = require('../lib/http');
const { normalizeUsername, usernameError } = require('../lib/username');

exports.getProfile = wrap(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'name username bio genres city avatarUrl reputation createdAt',
  );
  if (!user) fail(404, 'User not found');
  res.json({ user });
});

exports.updateProfile = wrap(async (req, res) => {
  if (req.user.userId !== req.params.id) fail(403, 'Forbidden');
  const update = pick(req.body, ['name', 'bio', 'genres', 'city', 'avatarUrl']);

  // Username, when present, is validated and checked for uniqueness here; the
  // DB unique index is the real guard. Owners may re-save their own handle.
  if (req.body.username !== undefined) {
    const username = normalizeUsername(req.body.username);
    const problem = usernameError(username);
    if (problem) fail(400, problem);
    const holder = await User.findOne({ username }).select('_id');
    if (holder && String(holder._id) !== req.params.id)
      fail(409, 'That username is taken. Please choose another.');
    update.username = username;
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true },
    ).select('-passwordHash');
    if (!user) fail(404, 'User not found');
    res.json({ user });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.username)
      fail(409, 'That username is taken. Please choose another.');
    throw err;
  }
});
