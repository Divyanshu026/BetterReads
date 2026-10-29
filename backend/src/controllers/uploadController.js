const cloudinary = require('../services/cloudinary');
const config = require('../config');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { wrap, fail } = require('../lib/http');
const configured = () =>
  config.cloudinary.cloud_name && config.cloudinary.api_key && config.cloudinary.api_secret;
function decode(image) {
  const match =
    typeof image === 'string' &&
    image.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) fail(400, 'Upload a PNG, JPEG or WebP image');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024)
    fail(400, 'Images must be smaller than 5 MB');
  const valid =
    match[1] === 'png'
      ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : match[1] === 'jpeg'
        ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
        : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) fail(400, 'Image content does not match its format');
  return { buffer, extension: match[1] };
}
async function save(image, userId) {
  const { buffer, extension } = decode(image);
  const folder = 'betterreads/' + userId;
  if (configured()) {
    const result = await cloudinary.uploader.upload(image, {
      folder,
      resource_type: 'image',
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
    });
    return { url: result.secure_url, publicId: result.public_id };
  }
  const directory = path.join(__dirname, '../../uploads', folder);
  await fs.mkdir(directory, { recursive: true });
  const filename = crypto.randomUUID() + '.' + extension;
  await fs.writeFile(path.join(directory, filename), buffer);
  return { url: '/uploads/' + folder + '/' + filename, publicId: folder + '/' + filename };
}
exports.uploadImage = wrap(async (req, res) =>
  res.json(await save(req.body.image, req.user.userId)),
);
exports.uploadMultipleImages = wrap(async (req, res) => {
  if (!Array.isArray(req.body.images) || !req.body.images.length || req.body.images.length > 5)
    fail(400, 'Upload 1 to 5 images');
  req.body.images.forEach(decode);
  res.json({
    images: await Promise.all(req.body.images.map((image) => save(image, req.user.userId))),
  });
});
exports.deleteImage = wrap(async (req, res) => {
  const id = req.params.publicId;
  const prefix = 'betterreads/' + req.user.userId + '/';
  if (
    !id.startsWith(prefix) ||
    !/^[a-zA-Z0-9._-]+$/.test(id.slice(prefix.length)) ||
    id.includes('..')
  )
    fail(403, 'You can only delete your own images');
  if (configured()) await cloudinary.uploader.destroy(id);
  else
    await fs.unlink(path.join(__dirname, '../../uploads', id)).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  res.json({ success: true });
});
