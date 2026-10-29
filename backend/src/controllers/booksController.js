const Book = require('../models/Book');
const { wrap, fail, pick } = require('../lib/http');
const fields = [
  'title',
  'author',
  'isbn',
  'genre',
  'condition',
  'description',
  'photos',
  'priceCents',
  'barterAvailable',
];
const data = (body) => ({
  ...pick(body, fields),
  ...(body.city !== undefined ? { location: { city: body.city } } : {}),
});
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
exports.createBook = wrap(async (req, res) =>
  res
    .status(201)
    .json(await Book.create({ ...data(req.body), ownerId: req.user.userId, currency: 'INR' })),
);
exports.listBooks = wrap(async (req, res) => {
  const { q, genre, city, sellerId, status, exchange, minPrice, maxPrice, sort } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1),
    limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const filter = {};
  if (q)
    filter.$or = ['title', 'author', 'isbn'].map((key) => ({
      [key]: new RegExp(escape(String(q).slice(0, 150)), 'i'),
    }));
  if (genre) filter.genre = String(genre);
  if (city) filter['location.city'] = String(city);
  if (sellerId) filter.ownerId = sellerId;
  if (status) filter.status = String(status);
  if (exchange === 'true') filter.barterAvailable = true;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.priceCents = {};
    if (minPrice !== undefined) {
      if (!Number.isFinite(Number(minPrice))) fail(400, 'Invalid price');
      filter.priceCents.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined) {
      if (!Number.isFinite(Number(maxPrice))) fail(400, 'Invalid price');
      filter.priceCents.$lte = Number(maxPrice);
    }
  }
  res.set('X-Total-Count', String(await Book.countDocuments(filter)));
  res.json(
    await Book.find(filter)
      .populate('ownerId', 'name avatarUrl')
      .sort(
        sort === 'price-asc'
          ? { priceCents: 1, _id: 1 }
          : sort === 'price-desc'
            ? { priceCents: -1, _id: 1 }
            : { createdAt: -1, _id: -1 },
      )
      .skip((page - 1) * limit)
      .limit(limit),
  );
});
exports.getBook = wrap(async (req, res) => {
  const book = await Book.findById(req.params.id).populate('ownerId', 'name avatarUrl reputation');
  if (!book) fail(404, 'Book not found');
  res.json(book);
});
exports.updateBook = wrap(async (req, res) => {
  const book = await Book.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.userId, status: 'available' },
    { $set: data(req.body) },
    { new: true, runValidators: true },
  );
  if (!book) fail(409, 'Only your available listings can be edited');
  res.json(book);
});
exports.deleteBook = wrap(async (req, res) => {
  const book = await Book.findOneAndDelete({
    _id: req.params.id,
    ownerId: req.user.userId,
    status: 'available',
  });
  if (!book) fail(409, 'Only your available listings can be deleted');
  res.json({ success: true });
});
exports.suggestBooksAuthors = wrap(async (req, res) => {
  if (!req.query.q) return res.json([]);
  const regex = new RegExp(escape(String(req.query.q).slice(0, 150)), 'i');
  const books = await Book.find({ $or: [{ title: regex }, { author: regex }] })
    .limit(8)
    .select('title author');
  res.json(books.map((book) => ({ type: 'title', value: book.title })));
});
