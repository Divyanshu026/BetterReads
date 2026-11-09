export const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
import { getToken } from './auth.js';
import { appPath } from './paths.js';
export { getToken } from './auth.js';
export const photoUrl = (url) => url?.startsWith('/uploads/') ? apiBase + url : url?.startsWith('/covers/') ? appPath(url) : url;
export async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  if (response.status === 429) { const error = new Error('Too many requests. Please wait a few minutes and try again.'); error.status = 429; throw error; }
  if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Unable to reach the server. Please try again.');
  const data = await response.json();
  if (!response.ok) { const error = new Error(data?.error?.message || 'Unable to complete this request.'); error.status = response.status; throw error; }
  return data;
}
export async function getAllBooks(query = '', signal) {
  const items = []; let page = 1; let total = 0;
  do {
    const response = await fetch(`${apiBase}/api/books?limit=100&page=${page}${query}`, { signal });
    if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Unable to load books.');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Unable to load books.');
    items.push(...data); total = Number(response.headers.get('X-Total-Count') || data.length); page += 1;
    if (!data.length) break;
  } while (items.length < total);
  return items;
}
export function localGet(key, fallback) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } }
export function localSet(key, value) { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new Event('betterreads:local-change')); }

// Fetch the viewer's wishlist IDs once and share the result, so a grid of
// cards makes a single request instead of one /wishlist/check call per card.
let wishlistIdsPromise = null;
export function getWishlistIds() {
  if (!getToken()) return Promise.resolve(new Set());
  if (!wishlistIdsPromise) {
    wishlistIdsPromise = api('/api/wishlist')
      .then((data) => new Set((data.wishlist || []).map((book) => String(book._id))))
      .catch((err) => { wishlistIdsPromise = null; throw err; });
  }
  return wishlistIdsPromise;
}
export function invalidateWishlistIds() { wishlistIdsPromise = null; }

const accountRequests = new Map();
export function getCurrentUser() {
  const token = getToken();
  if (!accountRequests.has(token)) {
    const request = api('/api/auth/me').finally(() => accountRequests.delete(token));
    accountRequests.set(token, request);
  }
  return accountRequests.get(token);
}
