const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { wrap, fail } = require('../lib/http');
const respond = (res, user) =>
  res.json({
    token: jwt.sign({ userId: String(user._id) }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    }),
    user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
  });
function credentials(body) {
  if (
    typeof body.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
    typeof body.password !== 'string' ||
    Buffer.byteLength(body.password) > 72
  )
    fail(400, 'Enter a valid email and password (maximum 72 bytes).');
  return body.email.trim().toLowerCase();
}
exports.register = wrap(async (req, res) => {
  const email = credentials(req.body);
  if (req.body.password.length < 8 || typeof req.body.name !== 'string' || !req.body.name.trim())
    fail(400, 'Name and a password of at least 8 characters are required.');
  if (await User.exists({ email })) fail(409, 'Email already in use');
  const user = await User.create({
    email,
    name: req.body.name.trim().slice(0, 100),
    passwordHash: await bcrypt.hash(req.body.password, 12),
  });
  res.status(201);
  respond(res, user);
});
exports.login = wrap(async (req, res) => {
  const email = credentials(req.body);
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash)))
    fail(401, 'Invalid credentials');
  respond(res, user);
});
