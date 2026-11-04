const mongoose = require('mongoose');
const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  body: { type: String, required: true, trim: true, maxlength: 3000 },
  category: { type: String, required: true, maxlength: 60 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentCount: { type: Number, default: 0 },
}, { timestamps: true });
PostSchema.index({ createdAt: -1, _id: -1 });
module.exports = mongoose.model('CommunityPost', PostSchema);
