// Verify a Google ID token (the `credential` from Google Identity Services)
// without adding an OAuth dependency: fetch Google's public JWKS, import the
// matching key, and verify the RS256 signature plus issuer/audience claims.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

let cache = { keys: new Map(), expiresAt: 0 };

async function getKey(kid) {
  if (cache.expiresAt < Date.now() || !cache.keys.has(kid)) {
    const response = await fetch(CERTS_URL);
    if (!response.ok) throw new Error('Unable to reach Google to verify sign-in.');
    const { keys } = await response.json();
    const maxAge = Number((response.headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1] || 3600);
    cache = { keys: new Map(), expiresAt: Date.now() + maxAge * 1000 };
    for (const jwk of keys || []) {
      cache.keys.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: 'jwk' }));
    }
  }
  const key = cache.keys.get(kid);
  if (!key) throw new Error('Unable to verify this Google sign-in. Please try again.');
  return key;
}

// Returns { sub, email, emailVerified, name, picture } or throws a user-safe error.
async function verifyGoogleIdToken(credential) {
  if (!config.googleClientId) {
    const error = new Error('Google sign-in is not configured on this server.');
    error.status = 501;
    throw error;
  }
  if (typeof credential !== 'string' || !credential) {
    const error = new Error('Missing Google credential.');
    error.status = 400;
    throw error;
  }
  const header = jwt.decode(credential, { complete: true })?.header;
  if (!header?.kid) {
    const error = new Error('Invalid Google credential.');
    error.status = 401;
    throw error;
  }
  let payload;
  try {
    payload = jwt.verify(credential, await getKey(header.kid), {
      algorithms: ['RS256'],
      audience: config.googleClientId,
      issuer: ISSUERS,
    });
  } catch {
    const error = new Error('Could not verify your Google account. Please try again.');
    error.status = 401;
    throw error;
  }
  return {
    sub: payload.sub,
    email: (payload.email || '').trim().toLowerCase(),
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    name: payload.name || '',
    picture: payload.picture || '',
  };
}

module.exports = { verifyGoogleIdToken };
