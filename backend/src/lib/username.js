// Username rules shared by the auth and profile controllers and the backfill
// script. Usernames are stored normalized (lowercased) so uniqueness is
// case-insensitive; the stored value is also what we display.
const MIN = 3;
const MAX = 30;

// Names we never hand out: route prefixes, support-looking handles, and words
// that would be confusing or abusable as a public profile handle.
const RESERVED = new Set([
  'admin',
  'administrator',
  'root',
  'support',
  'help',
  'betterreads',
  'moderator',
  'mod',
  'staff',
  'system',
  'api',
  'auth',
  'login',
  'logout',
  'signup',
  'register',
  'me',
  'user',
  'users',
  'account',
  'settings',
  'profile',
  'readers',
  'reader',
  'books',
  'book',
  'community',
  'inbox',
  'wishlist',
  'null',
  'undefined',
  'anonymous',
]);

// Normalize a candidate: strip a leading @, trim, collapse whitespace away, and
// lowercase. Returns '' for anything that isn't a usable string.
function normalizeUsername(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^@+/, '').toLowerCase();
}

// Validate an already-normalized username. Returns an error message, or '' when
// the value is acceptable. Keep the allowed set to letters, numbers, dot and
// underscore, disallow leading/trailing or doubled separators, and block
// reserved words.
function usernameError(normalized) {
  if (!normalized) return 'Choose a username.';
  if (normalized.length < MIN) return `Username must be at least ${MIN} characters.`;
  if (normalized.length > MAX) return `Username must be ${MAX} characters or fewer.`;
  if (!/^[a-z0-9._]+$/.test(normalized))
    return 'Use only letters, numbers, dots or underscores.';
  if (/^[._]|[._]$/.test(normalized)) return 'Username cannot start or end with a dot or underscore.';
  if (/[._]{2,}/.test(normalized)) return 'Username cannot contain two dots or underscores in a row.';
  if (!/[a-z0-9]/.test(normalized)) return 'Username must include a letter or number.';
  if (RESERVED.has(normalized)) return 'That username is reserved. Please choose another.';
  return '';
}

// Turn an arbitrary display name into a valid username base (no suffix yet).
// Falls back to 'reader' when nothing usable remains.
function baseFromName(name) {
  const cleaned = normalizeUsername(String(name || ''))
    .replace(/[^a-z0-9._]+/g, '')
    .replace(/^[._]+|[._]+$/g, '')
    .replace(/[._]{2,}/g, '.');
  const trimmed = cleaned.slice(0, MAX - 2);
  if (trimmed.length >= MIN && !RESERVED.has(trimmed)) return trimmed;
  if (trimmed.length > 0 && trimmed.length < MIN) return (trimmed + 'reader').slice(0, MAX);
  return 'reader';
}

// Build a candidate from a base plus a numeric suffix, keeping within MAX.
function withSuffix(base, suffix) {
  const digits = String(suffix);
  return base.slice(0, MAX - digits.length) + digits;
}

// Suggest an available username for `name`, checking candidates against the
// database via `exists(normalized) => Promise<boolean>`. Produces readable
// handles like `divyanshu42`. Randomizes the suffix so concurrent signups for
// the same name are unlikely to fight over the same candidate.
async function suggestUsername(name, exists) {
  const base = baseFromName(name);
  if (base.length >= MIN && !usernameError(base) && !(await exists(base))) return base;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const span = Math.min(10 ** (2 + Math.floor(attempt / 5)), 1_000_000);
    const candidate = withSuffix(base, Math.floor(Math.random() * span) + 1);
    if (!usernameError(candidate) && !(await exists(candidate))) return candidate;
  }
  // Extremely unlikely fallback: a long random suffix.
  return withSuffix(base.slice(0, 10), Date.now() % 1_000_000);
}

module.exports = {
  MIN,
  MAX,
  RESERVED,
  normalizeUsername,
  usernameError,
  baseFromName,
  suggestUsername,
};
