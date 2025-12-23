// JSON Web Token library for verifying Bearer tokens
const jwt = require('jsonwebtoken');
// Central configuration with JWT secret and expiry
const config = require('../config');

// Middleware to protect routes with JWT (Authorization: Bearer <token>)
function requireAuth(req, res, next) {
  // Read the Authorization header
  const auth = req.headers.authorization;
  // Ensure it's present and starts with the Bearer scheme
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: { message: 'Unauthorized' } });
  // Extract the token string (everything after 'Bearer ')
  const token = auth.split(' ')[1];
  try {
    // Verify signature and expiry; payload typically contains { userId }
    const payload = jwt.verify(token, config.jwtSecret);
    // Attach decoded payload to req.user for downstream handlers
    req.user = payload;
    next();
  } catch (err) {
    // If verification fails, reject with 401
    return res.status(401).json({ error: { message: 'Invalid token' } });
  }
}

// Export middleware for use in routes (e.g., router.patch(..., requireAuth, handler))
module.exports = { requireAuth };
