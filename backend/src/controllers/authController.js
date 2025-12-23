// Import bcrypt for hashing passwords securely
const bcrypt = require('bcryptjs');
// Import jsonwebtoken to issue and verify JWTs (tokens used for auth)
const jwt = require('jsonwebtoken');
// Mongoose model for users (MongoDB collection)
const User = require('../models/User');
// Centralized configuration (reads environment variables)
const config = require('../config');

// Register a new user
async function register(req, res) {
  // Read fields sent by the client in the HTTP request body (JSON)
  // Using object destructuring to pick out only what we need
  const { email, password, name } = req.body;

  // Basic validation: ensure required fields exist
  // If either email or password is missing, respond with HTTP 400 (Bad Request)
  if (!email || !password) return res.status(400).json({ error: { message: 'Email and password required' } });

  // Database lookup: check if a user with the given email already exists
  const existing = await User.findOne({ email });

  // If a record exists, return HTTP 409 (Conflict) to indicate duplicate email
  if (existing) return res.status(409).json({ error: { message: 'Email already in use' } });

  // Generate a cryptographic salt for hashing the password
  // The number (10) is the “cost factor” — higher means more CPU work and better security
  const salt = await bcrypt.genSalt(10);

  // Hash the plaintext password together with the salt
  // Result is a secure, salted hash — this is what we store (never store plaintext)
  const passwordHash = await bcrypt.hash(password, salt);

  // Create a new user document in MongoDB with the hashed password
  const user = await User.create({ email, passwordHash, name });

  // Create a signed JSON Web Token (JWT) that encodes the user’s ID
  // The token is signed using a secret and set to expire based on config
  const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

  // Send a successful JSON response containing:
  // - token: for authenticating subsequent requests (Authorization: Bearer <token>)
  // - user: minimal public fields (never send passwordHash)
  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
}

async function login(req, res) {
  // Read credentials from body
  const { email, password } = req.body;

  // Require both fields
  if (!email || !password) return res.status(400).json({ error: { message: 'Email and password required' } });

  // Find the user by email
  const user = await User.findOne({ email });

  // If not found or no hash, reject
  if (!user || !user.passwordHash) return res.status(401).json({ error: { message: 'Invalid credentials' } });

  // Compare plaintext password with stored hash
  const match = await bcrypt.compare(password, user.passwordHash);

  // If mismatch, reject
  if (!match) return res.status(401).json({ error: { message: 'Invalid credentials' } });

  // On success, issue a JWT (same as register)
  const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

  // Respond with token and user info
  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
}

module.exports = { register, login };
