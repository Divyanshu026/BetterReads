// Socket.io server, JWT for authenticating socket connections
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const Chat = require('../models/Chat');

// Initialize Socket.io on the given HTTP server
function initSockets(server) {
  // Allow CORS from any origin for development; tighten in production
  const io = new Server(server, { cors: { origin: '*' } });

  // Middleware to authenticate sockets via JWT during the handshake
  io.use((socket, next) => {
    // Client should pass { auth: { token: 'BearerToken' } } when connecting
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      // Attach the decoded payload (e.g., { userId }) to the socket
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  // Handle new socket connections
  io.on('connection', (socket) => {
    console.log('socket connected', socket.id, 'user', socket.user.userId);

    // Join a chat room (chatId is a MongoDB ObjectId string)
    socket.on('join_chat', async (chatId) => {
      socket.join(chatId);
    });

    // Leave a chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(chatId);
    });

    // Send a message to a chat: persist then broadcast to room
    socket.on('message', async ({ chatId, text }) => {
      // Create the message object (sender is authenticated user)
      const msg = { senderId: socket.user.userId, text };
      // Persist to MongoDB
      const chat = await Chat.findById(chatId);
      if (chat) {
        chat.messages.push(msg);
        chat.lastMessage = text;
        await chat.save();
      }
      // Emit to all participants in the chat room
      io.to(chatId).emit('message', { chatId, message: msg });
    });

    // Log disconnects (useful for debugging)
    socket.on('disconnect', () => {
      console.log('socket disconnect', socket.id);
    });
  });
}

module.exports = { initSockets };
