// Socket.io client for real-time chat
import { io } from 'socket.io-client';

let socket = null;

// Initialize socket connection with auth token
export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
};

// Get current socket instance
export const getSocket = () => socket;

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Join a chat room
export const joinChat = (chatId) => {
  if (socket) {
    socket.emit('join_chat', chatId);
  }
};

// Leave a chat room
export const leaveChat = (chatId) => {
  if (socket) {
    socket.emit('leave_chat', chatId);
  }
};

// Send a message via socket
export const sendSocketMessage = (chatId, text) => {
  if (socket) {
    socket.emit('message', { chatId, text });
  }
};

// Listen for new messages
export const onMessage = (callback) => {
  if (socket) {
    socket.on('message', callback);
  }
};

// Remove message listener
export const offMessage = (callback) => {
  if (socket) {
    socket.off('message', callback);
  }
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  joinChat,
  leaveChat,
  sendSocketMessage,
  onMessage,
  offMessage,
};
