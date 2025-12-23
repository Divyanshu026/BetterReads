// Upload controller - Cloudinary image uploads with local fallback
const cloudinary = require('../services/cloudinary');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return config.cloudinary.cloud_name && 
         config.cloudinary.api_key && 
         config.cloudinary.api_secret;
};

// Save base64 image locally (fallback when Cloudinary not configured)
const saveImageLocally = async (base64Data, folder) => {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, '../../uploads', folder);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Extract base64 data and mime type
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image data format');
  }

  const ext = matches[1];
  const data = matches[2];
  const buffer = Buffer.from(data, 'base64');

  // Generate unique filename
  const filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  const filepath = path.join(uploadsDir, filename);

  // Save file
  fs.writeFileSync(filepath, buffer);

  // Return URL that will be served by Express static middleware
  return {
    url: `/uploads/${folder}/${filename}`,
    publicId: `${folder}/${filename}`,
    width: 0,
    height: 0
  };
};

// POST /api/upload — upload an image to Cloudinary
async function uploadImage(req, res) {
  try {
    const { image, folder = 'betterreads' } = req.body;

    if (!image) {
      return res.status(400).json({ error: { message: 'Image data is required' } });
    }

    let result;

    if (isCloudinaryConfigured()) {
      // Upload to Cloudinary
      const cloudResult = await cloudinary.uploader.upload(image, {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      result = {
        url: cloudResult.secure_url,
        publicId: cloudResult.public_id,
        width: cloudResult.width,
        height: cloudResult.height,
      };
    } else {
      // Fallback to local storage
      console.log('Cloudinary not configured, saving locally...');
      result = await saveImageLocally(image, folder);
    }

    res.json(result);
  } catch (err) {
    console.error('Upload image error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// POST /api/upload/multiple — upload multiple images
async function uploadMultipleImages(req, res) {
  try {
    const { images, folder = 'betterreads' } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: { message: 'Images array is required' } });
    }

    if (images.length > 5) {
      return res.status(400).json({ error: { message: 'Maximum 5 images allowed per upload' } });
    }

    let uploaded;

    if (isCloudinaryConfigured()) {
      // Upload all images to Cloudinary in parallel
      const uploadPromises = images.map(image =>
        cloudinary.uploader.upload(image, {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        })
      );

      const results = await Promise.all(uploadPromises);

      uploaded = results.map(result => ({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      }));
    } else {
      // Fallback to local storage
      console.log('Cloudinary not configured, saving locally...');
      uploaded = await Promise.all(
        images.map(image => saveImageLocally(image, folder))
      );
    }

    res.json({ images: uploaded });
  } catch (err) {
    console.error('Upload multiple images error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// DELETE /api/upload/:publicId — delete an image from Cloudinary
async function deleteImage(req, res) {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ error: { message: 'Public ID is required' } });
    }

    // Decode the public ID (it may contain slashes, which are URL-encoded)
    const decodedPublicId = decodeURIComponent(publicId);

    const result = await cloudinary.uploader.destroy(decodedPublicId);

    if (result.result === 'ok') {
      res.json({ success: true, message: 'Image deleted' });
    } else {
      res.status(404).json({ error: { message: 'Image not found or already deleted' } });
    }
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

module.exports = { uploadImage, uploadMultipleImages, deleteImage };
