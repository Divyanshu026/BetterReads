const router = require('express').Router();
const Order = require('../models/Order');
const { requireAuth } = require('../middleware/auth');
const { wrap, fail } = require('../lib/http');
router.use(requireAuth);
router.get(
  '/',
  wrap(async (req, res) => {
    const sales = req.query.view === 'sales';
    const orders = await Order.find(
      sales ? { 'items.sellerId': req.user.userId, status: 'paid' } : { buyerId: req.user.userId },
    )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(
      orders.map((order) =>
        sales
          ? {
              _id: order._id,
              createdAt: order.createdAt,
              status: order.status,
              shipping: order.shipping,
              items: order.items.filter((item) => String(item.sellerId) === req.user.userId),
            }
          : order,
      ),
    );
  }),
);
router.get(
  '/:id',
  wrap(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, buyerId: req.user.userId });
    if (!order) fail(404, 'Order not found');
    res.json(order);
  }),
);
router.patch(
  '/:id/items/:bookId',
  wrap(async (req, res) => {
    const { fulfillment, tracking } = req.body;
    if (
      !['shipped', 'delivered'].includes(fulfillment) ||
      (tracking !== undefined && (typeof tracking !== 'string' || tracking.length > 200))
    )
      fail(400, 'Invalid shipping update');
    const filter = { _id: req.params.id, status: 'paid' };
    const item = {
      bookId: req.params.bookId,
      fulfillment: fulfillment === 'shipped' ? 'processing' : 'shipped',
    };
    if (fulfillment === 'shipped') item.sellerId = req.user.userId;
    else filter.buyerId = req.user.userId;
    const update = { 'items.$.fulfillment': fulfillment };
    if (fulfillment === 'shipped') update['items.$.tracking'] = tracking || '';
    const order = await Order.findOneAndUpdate(
      { ...filter, items: { $elemMatch: item } },
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!order) fail(409, 'You cannot make this shipping update');
    res.json({ success: true });
  }),
);
module.exports = router;
