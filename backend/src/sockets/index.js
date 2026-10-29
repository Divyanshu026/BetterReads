const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const Chat = require('../models/Chat');
function initSockets(server) {
  const io = new Server(server, { cors: { origin: config.frontendUrl }, maxHttpBufferSize: 16384 });
  io.use((socket, next) => {
    try {
      socket.user = jwt.verify(socket.handshake.auth?.token, config.jwtSecret, {
        algorithms: ['HS256'],
      });
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });
  io.on('connection', (socket) => {
    const expiry = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.user.exp * 1000 - Date.now()),
    );
    socket.on('disconnect', () => clearTimeout(expiry));
    const member = async (id) => {
      if (!/^[a-f\d]{24}$/i.test(id || '')) throw new Error('Invalid chat');
      const chat = await Chat.findOne({ _id: id, participants: socket.user.userId });
      if (!chat) throw new Error('Not a participant');
      return chat;
    };
    socket.on('join_chat', async (id, ack) => {
      try {
        await member(id);
        await socket.join(id);
        ack?.({ success: true });
      } catch {
        ack?.({ error: 'Cannot join this conversation' });
      }
    });
    socket.on('leave_chat', (id) => {
      if (typeof id === 'string') socket.leave(id);
    });
    let lastSent = 0;
    socket.on('message', async (payload, ack) => {
      try {
        const { chatId, text } = payload || {};
        if (typeof text !== 'string' || !text.trim() || text.length > 4000)
          throw new Error('Invalid message');
        if (Date.now() - lastSent < 500) throw new Error('Please slow down');
        lastSent = Date.now();
        const chat = await member(chatId);
        chat.messages.push({ senderId: socket.user.userId, text: text.trim() });
        chat.lastMessage = text.trim();
        await chat.save();
        const message = chat.messages.at(-1);
        io.to(chatId).emit('message', { chatId, message });
        ack?.({ success: true, message });
      } catch (error) {
        ack?.({ error: error.message });
      }
    });
  });
  return io;
}
module.exports = { initSockets };
