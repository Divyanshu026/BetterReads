// Wishlist controller - saved/favorite books
const User = require('../models/User');
const Book = require('../models/Book');

// GET /api/wishlist — get current user's wishlist
async function getWishlist(req, res) {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).populate({
      path: 'wishlist',
      populate: { path: 'ownerId', select: 'name avatarUrl' },
    });

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    res.json({ wishlist: user.wishlist || [] });
  } catch (err) {
    console.error('Get wishlist error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// POST /api/wishlist/:bookId — add a book to wishlist
async function addToWishlist(req, res) {
  try {
    const userId = req.user.userId;
    const { bookId } = req.params;

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: { message: 'Book not found' } });
    }

    // Add to wishlist (use $addToSet to avoid duplicates)
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { wishlist: bookId } },
      { new: true }
    ).populate({
      path: 'wishlist',
      populate: { path: 'ownerId', select: 'name avatarUrl' },
    });

    res.json({ wishlist: user.wishlist });
  } catch (err) {
    console.error('Add to wishlist error:', err);
    res.status(400).json({ error: { message: err.message } });
  }
}

// DELETE /api/wishlist/:bookId — remove a book from wishlist
async function removeFromWishlist(req, res) {
  try {
    const userId = req.user.userId;
    const { bookId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { wishlist: bookId } },
      { new: true }
    ).populate({
      path: 'wishlist',
      populate: { path: 'ownerId', select: 'name avatarUrl' },
    });

    res.json({ wishlist: user.wishlist });
  } catch (err) {
    console.error('Remove from wishlist error:', err);
    res.status(400).json({ error: { message: err.message } });
  }
}

// GET /api/wishlist/check/:bookId — check if a book is in wishlist
async function checkWishlist(req, res) {
  try {
    const userId = req.user.userId;
    const { bookId } = req.params;

    const user = await User.findById(userId);
    const inWishlist = user.wishlist && user.wishlist.some(id => String(id) === bookId);

    res.json({ inWishlist });
  } catch (err) {
    console.error('Check wishlist error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

module.exports = { getWishlist, addToWishlist, removeFromWishlist, checkWishlist };
