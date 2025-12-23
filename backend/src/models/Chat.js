// Mongoose ODM for MongoDB
const mongoose = require('mongoose');

// Embedded message schema inside a chat
const MessageSchema = new mongoose.Schema({
  // Who sent the message
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Message text content
  text: { type: String },
  // Optional attachments (URLs to images/files)
  attachments: [{ type: String }],
  // Whether the recipient has seen the message
  seen: { type: Boolean, default: false },
}, { timestamps: true });

// Chat schema: participants and their message history
const ChatSchema = new mongoose.Schema({
  // Two or more user IDs who are part of this conversation
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Array of messages (embedded documents)
  messages: [MessageSchema],
  // Cached last message text for quick previews
  lastMessage: { type: String },
}, { timestamps: true });

// Export the Chat model
module.exports = mongoose.model('Chat', ChatSchema);
