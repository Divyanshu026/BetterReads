const User = require('../models/User');
const { wrap, fail, pick } = require('../lib/http');
exports.getProfile = wrap(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'name bio genres city avatarUrl reputation createdAt',
  );
  if (!user) fail(404, 'User not found');
  res.json({ user });
});
exports.updateProfile = wrap(async (req, res) => {
  if (req.user.userId !== req.params.id) fail(403, 'Forbidden');
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: pick(req.body, ['name', 'bio', 'genres', 'city', 'avatarUrl']) },
    { new: true, runValidators: true },
  ).select('-passwordHash');
  if (!user) fail(404, 'User not found');
  res.json({ user });
});
