// Express app instance and common middleware
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Route modules
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const booksRoutes = require('./routes/books');
const offersRoutes = require('./routes/offers');
const paymentsRoutes = require('./routes/payments');
const chatsRoutes = require('./routes/chats');
const uploadRoutes = require('./routes/upload');
const reviewsRoutes = require('./routes/reviews');
const wishlistRoutes = require('./routes/wishlist');

// Create the Express application
const app = express();

// Security headers (Helmet): helps protect against common web vulnerabilities
app.use(helmet());
// CORS: allow requests from the frontend domain (currently permissive)
app.use(cors());
// Parse JSON bodies up to 10mb (for payloads like images encoded as base64)
app.use(express.json({ limit: '10mb' }));
// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (fallback when Cloudinary not configured)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiter: limit requests per IP per window to mitigate abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use(limiter);

// Health check: simple endpoint to verify server is running
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Mount REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Export the configured Express app (used by server.js)
module.exports = app;
