// Express router for review endpoints
const express = require('express');
const router = express.Router();
const { createReview, listReviews, getReview, deleteReview, getReviewSummary } = require('../controllers/reviewsController');
const { requireAuth } = require('../middleware/auth');

// GET /api/reviews — list reviews (public, with filters)
router.get('/', listReviews);

// GET /api/reviews/summary/:userId — get review summary for a user (public)
router.get('/summary/:userId', getReviewSummary);

// GET /api/reviews/:id — get a single review (public)
router.get('/:id', getReview);

// POST /api/reviews — create a review (authenticated)
router.post('/', requireAuth, createReview);

// DELETE /api/reviews/:id — delete own review (authenticated)
router.delete('/:id', requireAuth, deleteReview);

module.exports = router;
