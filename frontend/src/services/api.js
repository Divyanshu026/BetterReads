// API service layer for backend communication
import axios from 'axios';

// Base API URL - uses Vite proxy in development
const API_BASE_URL = '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - clear token and redirect
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============ AUTH ============
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// ============ USERS ============
export const usersAPI = {
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (id, data) => api.patch(`/users/${id}`, data),
};

// ============ BOOKS ============
export const booksAPI = {
  list: (params) => api.get('/books', { params }),
  get: (id) => api.get(`/books/${id}`),
  create: (data) => api.post('/books', data),
  update: (id, data) => api.patch(`/books/${id}`, data),
  delete: (id) => api.delete(`/books/${id}`),
  // Suggest book titles/authors for autocomplete
  suggest: (q) => api.get('/books/suggest', { params: { q } }),
};

// ============ OFFERS ============
export const offersAPI = {
  list: (params) => api.get('/offers', { params }),
  get: (id) => api.get(`/offers/${id}`),
  create: (data) => api.post('/offers', data),
  updateStatus: (id, status) => api.patch(`/offers/${id}`, { status }),
  cancel: (id) => api.delete(`/offers/${id}`),
};

// ============ PAYMENTS ============
export const paymentsAPI = {
  createCheckout: (offerId) => api.post('/payments/checkout', { offerId }),
  getStatus: (offerId) => api.get(`/payments/status/${offerId}`),
};

// ============ CHATS ============
export const chatsAPI = {
  list: () => api.get('/chats'),
  create: (participantId) => api.post('/chats', { participantId }),
  get: (id) => api.get(`/chats/${id}`),
  sendMessage: (chatId, text, attachments) => api.post(`/chats/${chatId}/messages`, { text, attachments }),
  markAsRead: (chatId) => api.patch(`/chats/${chatId}/read`),
};

// ============ UPLOAD ============
export const uploadAPI = {
  single: (image, folder) => api.post('/upload', { image, folder }),
  multiple: (images, folder) => api.post('/upload/multiple', { images, folder }),
  delete: (publicId) => api.delete(`/upload/${encodeURIComponent(publicId)}`),
};

// ============ REVIEWS ============
export const reviewsAPI = {
  list: (params) => api.get('/reviews', { params }),
  get: (id) => api.get(`/reviews/${id}`),
  create: (data) => api.post('/reviews', data),
  delete: (id) => api.delete(`/reviews/${id}`),
  getSummary: (userId) => api.get(`/reviews/summary/${userId}`),
};

// ============ WISHLIST ============
export const wishlistAPI = {
  get: () => api.get('/wishlist'),
  add: (bookId) => api.post(`/wishlist/${bookId}`),
  remove: (bookId) => api.delete(`/wishlist/${bookId}`),
  check: (bookId) => api.get(`/wishlist/check/${bookId}`),
};

export default api;
