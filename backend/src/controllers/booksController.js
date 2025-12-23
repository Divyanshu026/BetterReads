// Book model providing CRUD access to book listings
const Book = require('../models/Book');

// POST /api/books — create a new listing (authenticated)
async function createBook(req, res) {
  try {
    const data = req.body; // read payload from client
    // Set the ownerId to the authenticated user
    data.ownerId = req.user.userId;
    
    // Handle city field - move to location.city
    if (data.city) {
      data.location = { city: data.city };
      delete data.city;
    }
    
    const book = await Book.create(data);
    // Respond with 201 Created and the new listing
    res.status(201).json(book);
  } catch (err) {
    console.error('Create book error:', err);
    res.status(400).json({ error: { message: err.message } });
  }
}

// GET /api/books — list with optional filters and pagination
async function listBooks(req, res) {
  try {
    const { page = 1, limit = 20, q, genre, minPrice, maxPrice, city, sellerId } = req.query;
    const filter = {};
    // Full-text search (requires text index on relevant fields)
    if (q) filter.$text = { $search: q };
    // Filter by genre
    if (genre) filter.genre = genre;
    // Price range filters (in cents)
    if (minPrice) filter.priceCents = { $gte: Number(minPrice) };
    if (maxPrice) filter.priceCents = { ...(filter.priceCents || {}), $lte: Number(maxPrice) };
    // City filter for location-based search
    if (city) filter['location.city'] = city;
    // Filter by seller/owner
    if (sellerId) filter.ownerId = sellerId;
    
    const books = await Book.find(filter)
      .populate('ownerId', 'name email')
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json(books);
  } catch (err) {
    console.error('List books error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// GET /api/books/:id — fetch a single listing by id
async function getBook(req, res) {
  try {
    const book = await Book.findById(req.params.id).populate('ownerId', 'name email');
    if (!book) return res.status(404).json({ error: { message: 'Book not found' } });
    
    // Transform for frontend compatibility (add sellerId field)
    const bookObj = book.toObject();
    bookObj.sellerId = bookObj.ownerId;
    bookObj.city = bookObj.location?.city;
    
    res.json(bookObj);
  } catch (err) {
    console.error('Get book error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// PATCH /api/books/:id — update an existing listing (authenticated owner only)
async function updateBook(req, res) {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: { message: 'Book not found' } });
    // Ownership check: only the owner may update
    if (String(book.ownerId) !== req.user.userId) return res.status(403).json({ error: { message: 'Forbidden' } });
    
    const data = req.body;
    // Handle city field
    if (data.city) {
      data.location = { city: data.city };
      delete data.city;
    }
    
    Object.assign(book, data);
    await book.save();
    res.json(book);
  } catch (err) {
    console.error('Update book error:', err);
    res.status(400).json({ error: { message: err.message } });
  }
}

// DELETE /api/books/:id — remove a listing (authenticated owner only)
async function deleteBook(req, res) {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: { message: 'Book not found' } });
    // Ownership check: only the owner may delete
    if (String(book.ownerId) !== req.user.userId) return res.status(403).json({ error: { message: 'Forbidden' } });
    await book.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete book error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// Export controller functions
module.exports = { createBook, listBooks, getBook, updateBook, deleteBook };
