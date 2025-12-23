// Chats controller - REST endpoints for chat/messaging
const Chat = require('../models/Chat');
const User = require('../models/User');

// GET /api/chats — list all chats for the current user
async function listChats(req, res) {
  try {
    const userId = req.user.userId;

    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'name email avatarUrl')
      .select('participants lastMessage updatedAt')
      .sort({ updatedAt: -1 });

    // Transform to include other participant info
    const transformed = chats.map(chat => {
      const otherParticipant = chat.participants.find(p => String(p._id) !== userId);
      return {
        _id: chat._id,
        participant: otherParticipant,
        lastMessage: chat.lastMessage,
        updatedAt: chat.updatedAt,
      };
    });

    res.json(transformed);
  } catch (err) {
    console.error('List chats error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// POST /api/chats — start a new chat with another user
async function createChat(req, res) {
  try {
    const { participantId } = req.body;
    const userId = req.user.userId;

    if (!participantId) {
      return res.status(400).json({ error: { message: 'participantId is required' } });
    }

    if (participantId === userId) {
      return res.status(400).json({ error: { message: 'Cannot start a chat with yourself' } });
    }

    // Check if the other user exists
    const otherUser = await User.findById(participantId);
    if (!otherUser) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    // Check if a chat already exists between these two users
    const existingChat = await Chat.findOne({
      participants: { $all: [userId, participantId] },
    }).populate('participants', 'name email avatarUrl');

    if (existingChat) {
      return res.json(existingChat);
    }

    // Create a new chat
    const chat = await Chat.create({
      participants: [userId, participantId],
      messages: [],
    });

    const populated = await Chat.findById(chat._id)
      .populate('participants', 'name email avatarUrl');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Create chat error:', err);
    res.status(400).json({ error: { message: err.message } });
  }
}

// GET /api/chats/:id — get a chat with message history
async function getChat(req, res) {
  try {
    const userId = req.user.userId;
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId)
      .populate('participants', 'name email avatarUrl')
      .populate('messages.senderId', 'name avatarUrl');

    if (!chat) {
      return res.status(404).json({ error: { message: 'Chat not found' } });
    }

    // Ensure the user is a participant
    const isParticipant = chat.participants.some(p => String(p._id) === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: { message: 'Forbidden: not a participant' } });
    }

    res.json(chat);
  } catch (err) {
    console.error('Get chat error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

// POST /api/chats/:id/messages — send a message (REST alternative to socket)
async function sendMessage(req, res) {
  try {
    const userId = req.user.userId;
    const chatId = req.params.id;
    const { text, attachments } = req.body;

    if (!text && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: { message: 'Message text or attachments required' } });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: { message: 'Chat not found' } });
    }

    // Ensure the user is a participant
    const isParticipant = chat.participants.some(p => String(p) === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: { message: 'Forbidden: not a participant' } });
    }

    // Add the message
    const message = {
      senderId: userId,
      text,
      attachments: attachments || [],
    };

    chat.messages.push(message);
    chat.lastMessage = text || '[Attachment]';
    await chat.save();

    // Return the newly added message
    const newMessage = chat.messages[chat.messages.length - 1];
    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(400).json({ error: { message: err.message } });
  }
}

// PATCH /api/chats/:id/read — mark messages as read
async function markAsRead(req, res) {
  try {
    const userId = req.user.userId;
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: { message: 'Chat not found' } });
    }

    // Mark all messages from other participants as seen
    let updated = false;
    chat.messages.forEach(msg => {
      if (String(msg.senderId) !== userId && !msg.seen) {
        msg.seen = true;
        updated = true;
      }
    });

    if (updated) {
      await chat.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

module.exports = { listChats, createChat, getChat, sendMessage, markAsRead };
