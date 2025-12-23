// Express router for book listing endpoints
const express = require('express');
const router = express.Router();
// Controller actions for CRUD and listing
const { createBook, listBooks, getBook, updateBook, deleteBook } = require('../controllers/booksController');
// Auth middleware to protect write operations
const { requireAuth } = require('../middleware/auth');

// GET /api/books — paginated list with filters
router.get('/', listBooks);
// POST /api/books — create a listing (authenticated)
router.post('/', requireAuth, createBook);
// GET /api/books/:id — fetch a single book by ID
router.get('/:id', getBook);
// PATCH /api/books/:id — update own listing (authenticated)
router.patch('/:id', requireAuth, updateBook);
// DELETE /api/books/:id — delete own listing (authenticated)
router.delete('/:id', requireAuth, deleteBook);

// Export the router
module.exports = router;
