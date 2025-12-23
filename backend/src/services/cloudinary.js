// Cloudinary SDK for image uploads and transformations
const cloudinary = require('cloudinary').v2;
const config = require('../config');

// Configure Cloudinary using environment variables (cloud name, API key/secret)
cloudinary.config(config.cloudinary);

// Export configured Cloudinary client for use in controllers/services
module.exports = cloudinary;
