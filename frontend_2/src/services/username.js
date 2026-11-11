// Client-side username helpers. These mirror the server rules for instant
// feedback, but the server is the authority: every username is validated and
// enforced for uniqueness on the backend before it is saved.
import { api, apiBase } from './api.js';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

// Normalize the same way the server does: drop a leading @, trim, lowercase.
export function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase();
}

// Mirror of the server's usernameError(). Returns '' when acceptable.
export function usernameError(normalized) {
  if (!normalized) return 'Choose a username.';
  if (normalized.length < USERNAME_MIN) return `Username must be at least ${USERNAME_MIN} characters.`;
  if (normalized.length > USERNAME_MAX) return `Username must be ${USERNAME_MAX} characters or fewer.`;
  if (!/^[a-z0-9._]+$/.test(normalized)) return 'Use only letters, numbers, dots or underscores.';
  if (/^[._]|[._]$/.test(normalized)) return 'Username cannot start or end with a dot or underscore.';
  if (/[._]{2,}/.test(normalized)) return 'Username cannot contain two dots or underscores in a row.';
  if (!/[a-z0-9]/.test(normalized)) return 'Username must include a letter or number.';
  return '';
}

// Ask the server whether a handle is valid and free. Returns
// { username, valid, available, reason }.
export async function checkUsername(username, signal) {
  const query = encodeURIComponent(normalizeUsername(username));
  const response = await fetch(`${apiBase}/api/auth/username/available?username=${query}`, { signal });
  if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json'))
    throw new Error('Unable to check that username right now.');
  return response.json();
}

// Ask the server for a readable, available suggestion from a display name.
export async function suggestUsername(name, signal) {
  const query = encodeURIComponent(name || 'reader');
  const response = await fetch(`${apiBase}/api/auth/username/suggest?name=${query}`, { signal });
  if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json'))
    throw new Error('Unable to suggest a username right now.');
  return (await response.json()).username;
}

// Claim/set the signed-in user's username (onboarding or a later change).
export async function claimUsername(username) {
  const data = await api('/api/auth/username', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: normalizeUsername(username) }),
  });
  return data.user;
}
