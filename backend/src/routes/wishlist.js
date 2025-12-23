// Express router for wishlist endpoints
const express = require('express');
const router = express.Router();
const { getWishlist, addToWishlist, removeFromWishlist, checkWishlist } = require('../controllers/wishlistController');
const { requireAuth } = require('../middleware/auth');

// All wishlist routes require authentication
router.use(requireAuth);

// GET /api/wishlist — get current user's wishlist
router.get('/', getWishlist);

// GET /api/wishlist/check/:bookId — check if book is in wishlist
router.get('/check/:bookId', checkWishlist);

// POST /api/wishlist/:bookId — add book to wishlist
router.post('/:bookId', addToWishlist);

// DELETE /api/wishlist/:bookId — remove book from wishlist
router.delete('/:bookId', removeFromWishlist);

module.exports = router;
