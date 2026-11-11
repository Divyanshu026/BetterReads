// Express router for chat/messaging endpoints
const express = require('express');
const router = express.Router();
const {
  listChats,
  createChat,
  getChat,
  sendMessage,
  markAsRead,
} = require('../controllers/chatsController');
const { requireAuth, requireVerified } = require('../middleware/auth');

// All chat routes require authentication
router.use(requireAuth);

// GET /api/chats — list all chats for the current user
router.get('/', listChats);

// POST /api/chats — start a new chat (verified users only)
router.post('/', requireVerified, createChat);

// GET /api/chats/:id — get chat with message history
router.get('/:id', getChat);

// POST /api/chats/:id/messages — send a message (verified users only)
router.post('/:id/messages', requireVerified, sendMessage);

// PATCH /api/chats/:id/read — mark messages as read
router.patch('/:id/read', markAsRead);

module.exports = router;
