// Path utilities from Node.js, used to build a reliable absolute path to the .env file
const path = require('path');

// dotenv loads environment variables from a .env file into process.env
const dotenv = require('dotenv');

// Load variables from the .env file located at the project root (current working directory)
// This makes values like process.env.MONGO_URI available in code
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const frontendOrigins = [frontendUrl, ...(process.env.FRONTEND_ORIGINS || '').split(',')]
  .map((origin) => {
    try {
      return new URL(origin.trim()).origin;
    } catch {
      return null;
    }
  })
  .filter(Boolean);

// Export a single configuration object so the rest of the app can import settings
module.exports = {
  // Port Express will listen on; default to 5000 if not provided
  port: process.env.PORT || 5000,

  // MongoDB connection string (e.g., mongodb://127.0.0.1:27017/bookverse or Atlas URI)
  mongoUri: process.env.MONGO_URI,

  // Secret key for signing/verifying JWTs; keep this private and strong
  jwtSecret: process.env.JWT_SECRET,

  // Access-token lifetime. Kept short because an opaque refresh session (stored
  // server-side, delivered as an httpOnly cookie) silently reissues it.
  jwtExpiresIn: process.env.ACCESS_TOKEN_TTL || process.env.JWT_EXPIRES_IN || '15m',

  // How long a refresh session (and its cookies) lives, in days.
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30,

  // Optional cookie domain (e.g. '.dvyanshu.page' to share across subdomains).
  // Leave blank to scope cookies to the exact API host.
  cookieDomain: process.env.COOKIE_DOMAIN || '',

  // Base URL used to build links inside emails (verify / reset). Defaults to the
  // primary frontend URL.
  appUrl: (process.env.APP_URL || process.env.FRONTEND_URL || frontendUrl).replace(/\/$/, ''),

  // Outbound email (SMTP via Nodemailer). When `enabled` is false the mailer
  // falls back to logging messages to the console, so verify/reset flows work in
  // dev, demo, and tests without a real SMTP server.
  mail: {
    enabled: process.env.MAIL_ENABLED === 'true',
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'BetterReads <no-reply@betterreads.app>',
  },

  // Google OAuth client ID; when set, Google Sign-In is enabled. Leave blank to disable.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',

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
  // Primary frontend URL for redirects, included in the CORS allowlist.
  frontendUrl,

  // Additional comma-separated frontend origins allowed to call the API.
  frontendOrigins: [...new Set(frontendOrigins)],

  // Node environment
  nodeEnv: process.env.NODE_ENV || 'development',
};
