// Express router for offer (trade/purchase proposal) endpoints
const express = require('express');
const router = express.Router();
const { createOffer, listOffers, getOffer, updateOfferStatus, cancelOffer } = require('../controllers/offersController');
const { requireAuth } = require('../middleware/auth');

// All offer routes require authentication
router.use(requireAuth);

// GET /api/offers — list offers (filter by listingId, proposerId, or receivedByMe)
router.get('/', listOffers);

// POST /api/offers — create a new offer
router.post('/', createOffer);

// GET /api/offers/:id — get a single offer
router.get('/:id', getOffer);

// PATCH /api/offers/:id — accept or decline an offer
router.patch('/:id', updateOfferStatus);

// DELETE /api/offers/:id — cancel an offer
router.delete('/:id', cancelOffer);

module.exports = router;
