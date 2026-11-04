const express = require('express');
const mongoose = require('mongoose');
const Post = require('../models/CommunityPost');
const Comment = require('../models/CommunityComment');
const { requireAuth } = require('../middleware/auth');
const { wrap, fail } = require('../lib/http');
const router = express.Router();
const categories = ['General Discussion', 'Book Recommendations', 'Currently Reading', 'Reviews', 'Book Clubs', 'Exchange & Borrowing Discussions'];
const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
const validId = (id) => mongoose.isValidObjectId(id);

router.get('/posts', wrap(async (req, res) => {
  const page = Math.max(1, Math.min(1000, Number.parseInt(req.query.page, 10) || 1));
  const filter = {};
  if (req.query.author) { if (!validId(req.query.author)) fail(400, 'Invalid reader'); filter.author = req.query.author; }
  if (req.query.category) { if (!categories.includes(req.query.category)) fail(400, 'Invalid category'); filter.category = req.query.category; }
  const posts = await Post.find(filter).populate('author', 'name avatarUrl').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(21).lean();
  res.json({ posts: posts.slice(0, 20), hasMore: posts.length > 20 });
}));
router.post('/posts', requireAuth, wrap(async (req, res) => {
  const { title, body, category } = req.body;
  if (!validText(title, 150) || !validText(body, 3000) || !categories.includes(category)) fail(400, 'Enter a title, message, and valid category.');
  const post = await Post.create({ title: title.trim(), body: body.trim(), category, author: req.user.userId });
  await post.populate('author', 'name avatarUrl');
  res.status(201).json(post);
}));
router.get('/posts/:id/comments', wrap(async (req, res) => {
  if (!validId(req.params.id)) fail(400, 'Invalid discussion');
  const page = Math.max(1, Math.min(1000, Number.parseInt(req.query.page, 10) || 1));
  const comments = await Comment.find({ post: req.params.id }).populate('author', 'name avatarUrl').sort({ createdAt: 1, _id: 1 }).skip((page - 1) * 50).limit(51).lean();
  res.json({ comments: comments.slice(0, 50), hasMore: comments.length > 50 });
}));
router.post('/posts/:id/comments', requireAuth, wrap(async (req, res) => {
  if (!validId(req.params.id)) fail(400, 'Invalid discussion');
  if (!validText(req.body.body, 1000)) fail(400, 'Enter a reply of up to 1000 characters.');
  if (!(await Post.exists({ _id: req.params.id }))) fail(404, 'Discussion not found');
  const comment = await Comment.create({ post: req.params.id, author: req.user.userId, body: req.body.body.trim() });
  await Post.updateOne({ _id: req.params.id }, { $inc: { commentCount: 1 } });
  await comment.populate('author', 'name avatarUrl');
  res.status(201).json(comment);
}));
router.put('/posts/:id/like', requireAuth, wrap(async (req, res) => {
  if (!validId(req.params.id) || typeof req.body.liked !== 'boolean') fail(400, 'Invalid like');
  const post = await Post.findByIdAndUpdate(req.params.id, req.body.liked ? { $addToSet: { likes: req.user.userId } } : { $pull: { likes: req.user.userId } }, { new: true }).select('likes');
  if (!post) fail(404, 'Discussion not found');
  res.json({ likes: post.likes.length, liked: post.likes.some((id) => String(id) === req.user.userId) });
}));
module.exports = router;
