// Express router for image upload endpoints
const express = require('express');
const router = express.Router();
const { uploadImage, uploadMultipleImages, deleteImage } = require('../controllers/uploadController');
const { requireAuth } = require('../middleware/auth');

// All upload routes require authentication
router.use(requireAuth);

// POST /api/upload — upload a single image
router.post('/', uploadImage);

// POST /api/upload/multiple — upload multiple images
router.post('/multiple', uploadMultipleImages);

// DELETE /api/upload/:publicId — delete an image
router.delete('/:publicId(*)', deleteImage);

module.exports = router;
