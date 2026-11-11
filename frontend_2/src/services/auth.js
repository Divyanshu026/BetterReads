// Auth transport moved to httpOnly cookies set by the API, which JavaScript
// cannot read (and, cross-origin in production, are invisible to document.cookie
// entirely). So the frontend keeps a small local *hint* of whether the viewer is
// signed in — set after a successful auth response, cleared on logout or a 401.
// It is only a UI signal: every protected request is enforced server-side by the
// cookie, never by this flag.
const signedInKey = 'betterreads.signedIn';

// A monotonic nonce bumped on every auth change, used to key request caches
// (replacing the old "key by token value" trick now that there is no token).
let sessionNonce = 0;

export function isSignedIn() {
  try {
    return localStorage.getItem(signedInKey) === '1';
  } catch {
    return false;
  }
}

export function sessionKey() {
  return `${isSignedIn() ? 'in' : 'out'}:${sessionNonce}`;
}

export function markSignedIn() {
  sessionNonce += 1;
  try {
    localStorage.setItem(signedInKey, '1');
  } catch {
    /* ignore storage failures (private mode); the cookie still authenticates */
  }
  window.dispatchEvent(new Event('betterreads:auth-change'));
}

export function markSignedOut() {
  sessionNonce += 1;
  try {
    localStorage.removeItem(signedInKey);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('betterreads:auth-change'));
}
