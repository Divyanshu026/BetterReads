// Express router for chat/messaging endpoints
const express = require('express');
const router = express.Router();
const { listChats, createChat, getChat, sendMessage, markAsRead } = require('../controllers/chatsController');
const { requireAuth } = require('../middleware/auth');

// All chat routes require authentication
router.use(requireAuth);

// GET /api/chats — list all chats for the current user
router.get('/', listChats);

// POST /api/chats — start a new chat
router.post('/', createChat);

// GET /api/chats/:id — get chat with message history
router.get('/:id', getChat);

// POST /api/chats/:id/messages — send a message
router.post('/:id/messages', sendMessage);

// PATCH /api/chats/:id/read — mark messages as read
router.patch('/:id/read', markAsRead);

module.exports = router;
