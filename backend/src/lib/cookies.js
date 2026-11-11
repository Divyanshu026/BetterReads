// Centralizes all auth-cookie policy in one place so the controller never has
// to reason about SameSite/Secure/domain. Cross-site in production (the SPA and
// the API are different origins) requires SameSite=None + Secure; on localhost
// we use Lax without Secure so cookies work over plain http during development.
const config = require('../config');

const ACCESS_COOKIE = 'br_access';
const REFRESH_COOKIE = 'br_refresh';
// A non-httpOnly hint the frontend can read to answer "am I signed in?" without
// ever seeing the real token. Security is always enforced server-side; this is
// purely a UI signal that mirrors the httpOnly session's presence.
const SESSION_HINT_COOKIE = 'br_session';

// The refresh cookie is only ever sent to the auth endpoints that rotate it,
// so it is never exposed to the rest of the API surface.
const REFRESH_PATH = '/api/auth';

const isProd = () => config.nodeEnv === 'production';

function baseOptions({ httpOnly = true, path = '/', maxAgeMs } = {}) {
  const options = {
    httpOnly,
    secure: isProd(),
    sameSite: isProd() ? 'none' : 'lax',
    path,
  };
  if (config.cookieDomain) options.domain = config.cookieDomain;
  if (typeof maxAgeMs === 'number') options.maxAge = maxAgeMs;
  return options;
}

// Set the access + refresh cookies plus the JS-readable session hint.
// `persist` controls "remember me": when false the cookies are session cookies
// (cleared when the browser closes); when true they last the refresh lifetime.
function setAuthCookies(res, { access, refresh }, { persist = true } = {}) {
  const refreshMaxAge = persist ? config.refreshTokenTtlDays * 24 * 60 * 60 * 1000 : undefined;
  res.cookie(ACCESS_COOKIE, access, baseOptions({ maxAgeMs: persist ? refreshMaxAge : undefined }));
  res.cookie(
    REFRESH_COOKIE,
    refresh,
    baseOptions({ path: REFRESH_PATH, maxAgeMs: refreshMaxAge }),
  );
  res.cookie(
    SESSION_HINT_COOKIE,
    '1',
    baseOptions({ httpOnly: false, maxAgeMs: refreshMaxAge }),
  );
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, baseOptions());
  res.clearCookie(REFRESH_COOKIE, baseOptions({ path: REFRESH_PATH }));
  res.clearCookie(SESSION_HINT_COOKIE, baseOptions({ httpOnly: false }));
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_HINT_COOKIE,
  REFRESH_PATH,
  setAuthCookies,
  clearAuthCookies,
};
