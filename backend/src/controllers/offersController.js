const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const Book = require('../models/Book');
const { wrap, fail } = require('../lib/http');
exports.createOffer = wrap(async (req, res) => {
  const { listingId, type, amountCents, offeredBookIds = [] } = req.body;
  const book = await Book.findById(listingId);
  if (!book || book.status !== 'available') fail(409, 'Listing is not available');
  if (String(book.ownerId) === req.user.userId)
    fail(400, 'Cannot make an offer on your own listing');
  if (!['purchase', 'barter'].includes(type)) fail(400, 'Invalid offer type');
  if (type === 'purchase' && (!Number.isInteger(amountCents) || amountCents < 100))
    fail(400, 'Offer at least ₹1');
  if (type === 'barter') {
    if (
      !book.barterAvailable ||
      !Array.isArray(offeredBookIds) ||
      !offeredBookIds.length ||
      offeredBookIds.length > 5 ||
      new Set(offeredBookIds).size !== offeredBookIds.length
    )
      fail(400, 'Select 1 to 5 unique books for exchange');
    if (
      (await Book.countDocuments({
        _id: { $in: offeredBookIds },
        ownerId: req.user.userId,
        status: 'available',
      })) !== offeredBookIds.length
    )
      fail(400, 'You must own all available offered books');
  }
  res.status(201).json(
    await Offer.create({
      listingId,
      proposerId: req.user.userId,
      type,
      amountCents: type === 'purchase' ? amountCents : undefined,
      offeredBookIds: type === 'barter' ? offeredBookIds : [],
    }),
  );
});
const populate = (query) =>
  query
    .populate('listingId', 'title photos ownerId')
    .populate('proposerId', 'name avatarUrl')
    .populate('offeredBookIds', 'title photos');
exports.listOffers = wrap(async (req, res) => {
  const mine = await Book.find({ ownerId: req.user.userId }).select('_id');
  const filter = {
    $or: [{ proposerId: req.user.userId }, { listingId: { $in: mine.map((b) => b._id) } }],
  };
  if (req.query.listingId) filter.listingId = req.query.listingId;
  res.json(await populate(Offer.find(filter).sort({ createdAt: -1 }).limit(100)));
});
exports.getOffer = wrap(async (req, res) => {
  const offer = await populate(Offer.findById(req.params.id));
  if (
    !offer ||
    (String(offer.proposerId._id) !== req.user.userId &&
      String(offer.listingId?.ownerId) !== req.user.userId)
  )
    fail(404, 'Offer not found');
  res.json(offer);
});
exports.updateOfferStatus = wrap(async (req, res) => {
  if (!['accepted', 'declined'].includes(req.body.status)) fail(400, 'Invalid status');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const offer = await Offer.findById(req.params.id).session(session);
      if (!offer || offer.status !== 'pending') fail(409, 'Offer already processed or missing');
      const book = await Book.findById(offer.listingId).session(session);
      if (!book || String(book.ownerId) !== req.user.userId)
        fail(403, 'Only the listing owner can respond');
      if (req.body.status === 'accepted') {
        if (book.status !== 'available') fail(409, 'Book no longer available');
        if (offer.type === 'barter') {
          const result = await Book.updateMany(
            { _id: { $in: offer.offeredBookIds }, ownerId: offer.proposerId, status: 'available' },
            { status: 'exchanged' },
            { session },
          );
          if (result.modifiedCount !== offer.offeredBookIds.length)
            fail(409, 'Offered books are no longer available');
        }
        book.status = offer.type === 'barter' ? 'exchanged' : 'reserved';
        book.reservationId = String(offer._id);
        await book.save({ session });
        await Offer.updateMany(
          {
            listingId: { $in: [book._id, ...offer.offeredBookIds] },
            _id: { $ne: offer._id },
            status: 'pending',
          },
          { status: 'declined' },
          { session },
        );
      }
      offer.status = req.body.status;
      await offer.save({ session });
    });
  } finally {
    await session.endSession();
  }
  res.json(await populate(Offer.findById(req.params.id)));
});
exports.cancelOffer = wrap(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const offer = await Offer.findOne({
        _id: req.params.id,
        proposerId: req.user.userId,
      }).session(session);
      if (!offer || !['pending', 'accepted'].includes(offer.status) || offer.paymentCompleted)
        fail(409, 'This offer cannot be cancelled');
      if (offer.status === 'accepted') {
        if (offer.type !== 'purchase') fail(409, 'Completed exchanges cannot be cancelled');
        const result = await Book.updateOne(
          { _id: offer.listingId, status: 'reserved', reservationId: String(offer._id) },
          { $set: { status: 'available' }, $unset: { reservationId: 1 } },
          { session },
        );
        if (!result.modifiedCount)
          fail(409, 'Checkout is in progress. Wait for it to expire before cancelling.');
      }
      offer.status = 'cancelled';
      await offer.save({ session });
    });
  } finally {
    await session.endSession();
  }
  res.json({ success: true });
});
