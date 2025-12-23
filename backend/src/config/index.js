// Path utilities from Node.js, used to build a reliable absolute path to the .env file
const path = require('path');

// dotenv loads environment variables from a .env file into process.env
const dotenv = require('dotenv');

// Load variables from the .env file located at the project root (current working directory)
// This makes values like process.env.MONGO_URI available in code
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Export a single configuration object so the rest of the app can import settings
module.exports = {
  // Port Express will listen on; default to 5000 if not provided
  port: process.env.PORT || 5000,

  // MongoDB connection string (e.g., mongodb://127.0.0.1:27017/bookverse or Atlas URI)
  mongoUri: process.env.MONGO_URI,

  // Secret key for signing/verifying JWTs; keep this private and strong
  jwtSecret: process.env.JWT_SECRET,

  // Token lifetime for JWTs; examples: '1h', '7d'
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',

  // Cloudinary credentials for image uploads (optional until media is implemented)
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },

  // Stripe secret key for server-side API calls (payments)
  stripeSecret: process.env.STRIPE_SECRET_KEY,

  // Stripe webhook signing secret for verifying incoming webhook events
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  // Frontend URL for redirects (Stripe success/cancel URLs)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Node environment
  nodeEnv: process.env.NODE_ENV || 'development',
};
