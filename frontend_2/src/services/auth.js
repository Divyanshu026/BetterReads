const tokenKey = 'betterreads.authToken';
const signedOutKey = 'betterreads.signedOut';

// Pin an inherited remembered session to this tab so another tab can use a different account.
export function getToken() {
  if (sessionStorage.getItem(signedOutKey)) return null;
  const tabToken = sessionStorage.getItem(tokenKey);
  if (tabToken) return tabToken;
  const remembered = localStorage.getItem(tokenKey);
  if (remembered) sessionStorage.setItem(tokenKey, remembered);
  return remembered;
}
export function setToken(token, remember) {
  sessionStorage.removeItem(signedOutKey);
  sessionStorage.setItem(tokenKey, token);
  if (remember) localStorage.setItem(tokenKey, token);
  window.dispatchEvent(new Event('betterreads:auth-change'));
}
export function clearToken(expectedToken = getToken()) {
  if (expectedToken && getToken() !== expectedToken) return;
  sessionStorage.removeItem(tokenKey);
  sessionStorage.setItem(signedOutKey, '1');
  if (expectedToken && localStorage.getItem(tokenKey) === expectedToken) localStorage.removeItem(tokenKey);
  window.dispatchEvent(new Event('betterreads:auth-change'));
}
