// Express app instance and common middleware
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');

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
// CORS: allow only the configured frontend origins.
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || config.frontendOrigins.includes(origin)),
    // Allow the browser to send/receive the auth cookies cross-origin. The
    // origin callback reflects the specific request origin (never '*'), which
    // credentialed CORS requires.
    credentials: true,
    exposedHeaders: ['X-Total-Count'],
  }),
);
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  require('./lib/http').wrap(require('./controllers/paymentsController').handleWebhook),
);
// Parse JSON bodies up to 10mb (for payloads like images encoded as base64)
app.use(express.json({ limit: '10mb' }));
// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));
// Parse cookies so the auth middleware can read the httpOnly access/refresh cookies.
app.use(cookieParser());

// Serve uploaded files statically (fallback when Cloudinary not configured)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Disable rate limiting under the test runner, where many requests share one
// IP in a single process and would otherwise trip the caps.
const skipInTest = () => config.nodeEnv === 'test';

// Rate limiter: limit requests per IP per window to mitigate abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: skipInTest,
});
app.use(limiter);

// Health check: simple endpoint to verify server is running
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Mount REST API routes
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, skip: skipInTest }), authRoutes);
app.use('/api/community', require('./routes/community'));
app.use('/api/users', usersRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', require('./routes/orders'));
app.use((req, res) => res.status(404).json({ error: { message: 'Route not found' } }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status =
    err.status ||
    (err.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(err.name) ? 400 : 500);
  res.status(status).json({
    error: { message: status === 500 ? 'An unexpected server error occurred' : err.message },
  });
});

// Export the configured Express app (used by server.js)
module.exports = app;
