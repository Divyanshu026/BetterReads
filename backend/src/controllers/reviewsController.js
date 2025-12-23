// Reviews controller - user ratings and feedback
const Review = require('../models/Review');
const User = require('../models/User');
const Offer = require('../models/Offer');

// POST /api/reviews — create a new review
async function createReview(req, res) {
  try {
    const { revieweeId, offerId, rating, comment, transactionType } = req.body;
    const reviewerId = req.user.userId;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: { message: 'Rating must be between 1 and 5' } });
    }

    // Can't review yourself
    if (revieweeId === reviewerId) {
      return res.status(400).json({ error: { message: 'Cannot review yourself' } });
    }

    // Check if reviewee exists
    const reviewee = await User.findById(revieweeId);
    if (!reviewee) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    // If offerId provided, validate the offer
    if (offerId) {
      const offer = await Offer.findById(offerId).populate('listingId');
      if (!offer) {
        return res.status(404).json({ error: { message: 'Offer not found' } });
      }

      // Check that the offer is completed (accepted)
      if (offer.status !== 'accepted') {
        return res.status(400).json({ error: { message: 'Can only review completed transactions' } });
      }

      // Check that the reviewer was part of the transaction
      const isProposer = String(offer.proposerId) === reviewerId;
      const isOwner = String(offer.listingId.ownerId) === reviewerId;
      if (!isProposer && !isOwner) {
        return res.status(403).json({ error: { message: 'You were not part of this transaction' } });
      }

      // Check for duplicate review
      const existingReview = await Review.findOne({ reviewerId, offerId });
      if (existingReview) {
        return res.status(409).json({ error: { message: 'You have already reviewed this transaction' } });
      }
    }

    // Create the review
    const review = await Review.create({
      revieweeId,
      reviewerId,
      offerId,
      rating,
      comment,
      transactionType: transactionType || 'general',
    });

    // Update the reviewee's reputation
    const allReviews = await Review.find({ revieweeId });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / allReviews.length;

    await User.findByIdAndUpdate(revieweeId, {
      reputation: {
        score: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        reviewsCount: allReviews.length,
      },
    });

    const populated = await Review.findById(review._id)
      .populate('reviewerId', 'name avatarUrl')
      .populate('revieweeId', 'name avatarUrl');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Create review error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: { message: 'Duplicate review' } });
    }
    res.status(400).json({ error: { message: err.message } });
  }
}

// GET /api/reviews — list reviews (filter by revieweeId or reviewerId)
async function listReviews(req, res) {
  try {
    const { revieweeId, reviewerId, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (revieweeId) filter.revieweeId = revieweeId;
    if (reviewerId) filter.reviewerId = reviewerId;

    const reviews = await Review.find(filter)
      .populate('reviewerId', 'name avatarUrl')
      .populate('revieweeId', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Review.countDocuments(filter);

    res.json({
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('List reviews error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// GET /api/reviews/:id — get a single review
async function getReview(req, res) {
  try {
    const review = await Review.findById(req.params.id)
      .populate('reviewerId', 'name avatarUrl')
      .populate('revieweeId', 'name avatarUrl')
      .populate('offerId', 'type status');

    if (!review) {
      return res.status(404).json({ error: { message: 'Review not found' } });
    }

    res.json(review);
  } catch (err) {
    console.error('Get review error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// DELETE /api/reviews/:id — delete own review
async function deleteReview(req, res) {
  try {
    const userId = req.user.userId;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ error: { message: 'Review not found' } });
    }

    // Only the reviewer can delete
    if (String(review.reviewerId) !== userId) {
      return res.status(403).json({ error: { message: 'Forbidden: only reviewer can delete' } });
    }

    const revieweeId = review.revieweeId;
    await review.deleteOne();

    // Recalculate the reviewee's reputation
    const remainingReviews = await Review.find({ revieweeId });
    if (remainingReviews.length > 0) {
      const totalRating = remainingReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = totalRating / remainingReviews.length;
      await User.findByIdAndUpdate(revieweeId, {
        reputation: {
          score: Math.round(avgRating * 10) / 10,
          reviewsCount: remainingReviews.length,
        },
      });
    } else {
      await User.findByIdAndUpdate(revieweeId, {
        reputation: { score: 0, reviewsCount: 0 },
      });
    }

    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// GET /api/reviews/summary/:userId — get review summary for a user
async function getReviewSummary(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('reputation');
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    // Get rating distribution
    const distribution = await Review.aggregate([
      { $match: { revieweeId: user._id } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      const found = distribution.find(d => d._id === i);
      ratingDistribution[i] = found ? found.count : 0;
    }

    res.json({
      userId,
      averageRating: user.reputation?.score || 0,
      totalReviews: user.reputation?.reviewsCount || 0,
      ratingDistribution,
    });
  } catch (err) {
    console.error('Get review summary error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

module.exports = { createReview, listReviews, getReview, deleteReview, getReviewSummary };
