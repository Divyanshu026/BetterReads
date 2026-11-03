export const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const getToken = () => localStorage.getItem('betterreads.authToken') || sessionStorage.getItem('betterreads.authToken');
export const photoUrl = (url) => url?.startsWith('/uploads/') ? apiBase + url : url;
export async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Unable to reach the server. Please try again.');
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Unable to complete this request.');
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
