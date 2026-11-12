export const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
import { isSignedIn, sessionKey, markSignedOut } from './auth.js';
import { appPath } from './paths.js';
export { isSignedIn, sessionKey } from './auth.js';
export const photoUrl = (url) => url?.startsWith('/uploads/') ? apiBase + url : url?.startsWith('/covers/') ? appPath(url) : url;

// Auth now rides on httpOnly cookies, so every request must send credentials.
// The access cookie is short-lived; when it expires the server returns 401 and
// we transparently rotate it once via the refresh session, then retry.
let refreshInFlight = null;
function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${apiBase}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function requestOnce(path, options) {
  return fetch(`${apiBase}${path}`, { credentials: 'include', ...options });
}

export async function api(path, options = {}) {
  let response = await requestOnce(path, options);
  // A single silent refresh+retry on an expired access token. Never for the
  // refresh endpoint itself (it would loop), and only when we believe we have a
  // session to refresh.
  if (response.status === 401 && isSignedIn() && !path.startsWith('/api/auth/refresh')) {
    if (await refreshSession()) response = await requestOnce(path, options);
    else markSignedOut();
  }
  if (response.status === 429) { const error = new Error('Too many requests. Please wait a few minutes and try again.'); error.status = 429; throw error; }
  if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Unable to reach the server. Please try again.');
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Unable to complete this request.');
    error.status = response.status;
    error.code = data?.error?.code;
    // The soft email-verification gate: surface it centrally so any gated
    // action (offers, borrow, chat, checkout) prompts the user the same way.
    if (error.code === 'EMAIL_NOT_VERIFIED') notifyNeedsVerification();
    throw error;
  }
  return data;
}

// Fired when the server blocks an action because the email is unverified. A
// single listener (in AuthContext) shows the "verify your email" prompt, so no
// gated call site needs its own handling.
export function notifyNeedsVerification() {
  window.dispatchEvent(new Event('betterreads:needs-verification'));
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
  if (!isSignedIn()) return Promise.resolve(new Set());
  if (!wishlistIdsPromise) {
    wishlistIdsPromise = api('/api/wishlist')
      .then((data) => new Set((data.wishlist || []).map((book) => String(book._id))))
      .catch((err) => { wishlistIdsPromise = null; throw err; });
  }
  return wishlistIdsPromise;
}
export function invalidateWishlistIds() { wishlistIdsPromise = null; }

// Share a single in-flight /me request per session. Keyed by a session nonce
// (bumped on sign-in/out) rather than a token value, which no longer exists.
const accountRequests = new Map();
export function getCurrentUser() {
  const key = sessionKey();
  if (!accountRequests.has(key)) {
    const request = api('/api/auth/me').finally(() => accountRequests.delete(key));
    accountRequests.set(key, request);
  }
  return accountRequests.get(key);
}
