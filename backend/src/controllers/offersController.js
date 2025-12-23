// Offers controller - handles purchase and barter proposals
const Offer = require('../models/Offer');
const Book = require('../models/Book');

// POST /api/offers — create a new offer on a listing
async function createOffer(req, res) {
  try {
    const { listingId, type, offeredBookIds, amountCents } = req.body;
    const proposerId = req.user.userId;

    // Validate the listing exists and is available
    const book = await Book.findById(listingId);
    if (!book) {
      return res.status(404).json({ error: { message: 'Listing not found' } });
    }
    if (book.status !== 'available') {
      return res.status(400).json({ error: { message: 'Listing is no longer available' } });
    }
    // Prevent self-offers
    if (String(book.ownerId) === proposerId) {
      return res.status(400).json({ error: { message: 'Cannot make an offer on your own listing' } });
    }

    // Create the offer
    const offer = await Offer.create({
      listingId,
      proposerId,
      type,
      offeredBookIds: type === 'barter' ? offeredBookIds : [],
      amountCents: type === 'purchase' ? amountCents : undefined,
    });

    // Populate references for response
    const populated = await Offer.findById(offer._id)
      .populate('listingId', 'title photos priceCents')
      .populate('proposerId', 'name email avatarUrl')
      .populate('offeredBookIds', 'title photos');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Create offer error:', err);
    res.status(400).json({ error: { message: err.message } });
  }
}

// GET /api/offers — list offers (filter by listing owner or proposer)
async function listOffers(req, res) {
  try {
    const { listingId, proposerId, receivedByMe } = req.query;
    const userId = req.user.userId;
    const filter = {};

    if (listingId) {
      filter.listingId = listingId;
    }
    if (proposerId) {
      filter.proposerId = proposerId;
    }

    // Get offers on listings owned by the current user
    if (receivedByMe === 'true') {
      const myBooks = await Book.find({ ownerId: userId }).select('_id');
      const myBookIds = myBooks.map(b => b._id);
      filter.listingId = { $in: myBookIds };
    }

    const offers = await Offer.find(filter)
      .populate('listingId', 'title photos priceCents ownerId')
      .populate('proposerId', 'name email avatarUrl')
      .populate('offeredBookIds', 'title photos')
      .sort({ createdAt: -1 });

    res.json(offers);
  } catch (err) {
    console.error('List offers error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// GET /api/offers/:id — get a single offer
async function getOffer(req, res) {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('listingId', 'title photos priceCents ownerId')
      .populate('proposerId', 'name email avatarUrl')
      .populate('offeredBookIds', 'title photos');

    if (!offer) {
      return res.status(404).json({ error: { message: 'Offer not found' } });
    }
    res.json(offer);
  } catch (err) {
    console.error('Get offer error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// PATCH /api/offers/:id — accept or decline an offer (listing owner only)
async function updateOfferStatus(req, res) {
  try {
    const { status } = req.body;
    const userId = req.user.userId;

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: { message: 'Invalid status. Use "accepted" or "declined"' } });
    }

    const offer = await Offer.findById(req.params.id).populate('listingId');
    if (!offer) {
      return res.status(404).json({ error: { message: 'Offer not found' } });
    }

    // Only the listing owner can accept/decline
    if (String(offer.listingId.ownerId) !== userId) {
      return res.status(403).json({ error: { message: 'Forbidden: only listing owner can update offer status' } });
    }

    // Can only update pending offers
    if (offer.status !== 'pending') {
      return res.status(400).json({ error: { message: 'Offer has already been processed' } });
    }

    offer.status = status;
    await offer.save();

    // If accepted, update the book status
    if (status === 'accepted') {
      const book = await Book.findById(offer.listingId._id);
      if (book) {
        book.status = offer.type === 'purchase' ? 'reserved' : 'exchanged';
        await book.save();
      }

      // Decline all other pending offers on this listing
      await Offer.updateMany(
        { listingId: offer.listingId._id, _id: { $ne: offer._id }, status: 'pending' },
        { status: 'declined' }
      );
    }

    const populated = await Offer.findById(offer._id)
      .populate('listingId', 'title photos priceCents')
      .populate('proposerId', 'name email avatarUrl')
      .populate('offeredBookIds', 'title photos');

    res.json(populated);
  } catch (err) {
    console.error('Update offer status error:', err);
    res.status(400).json({ error: { message: err.message } });
  }
}

// DELETE /api/offers/:id — cancel an offer (proposer only)
async function cancelOffer(req, res) {
  try {
    const userId = req.user.userId;
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: { message: 'Offer not found' } });
    }

    // Only the proposer can cancel
    if (String(offer.proposerId) !== userId) {
      return res.status(403).json({ error: { message: 'Forbidden: only proposer can cancel offer' } });
    }

    // Can only cancel pending offers
    if (offer.status !== 'pending') {
      return res.status(400).json({ error: { message: 'Cannot cancel processed offer' } });
    }

    offer.status = 'cancelled';
    await offer.save();

    res.json({ success: true, message: 'Offer cancelled' });
  } catch (err) {
    console.error('Cancel offer error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

module.exports = { createOffer, listOffers, getOffer, updateOfferStatus, cancelOffer };
