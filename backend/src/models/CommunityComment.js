const mongoose = require('mongoose');
const CommentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 1000 },
}, { timestamps: true });
module.exports = mongoose.model('CommunityComment', CommentSchema);
