// A Bettereads-style fallback avatar for users without a photo. The icon and
// colour are chosen deterministically from a stable per-user key, so the same
// reader always gets the same avatar across renders, pages, and visits.
//
// Palette is drawn from the brand tokens (olive, red, wheat, ink) plus a couple
// of complementary shades so avatars stay on-brand in both themes.
const PALETTE = [
  { bg: '#303b23', fg: '#f8f3e8' }, // olive
  { bg: '#922323', fg: '#fff8f0' }, // red
  { bg: '#e3c98b', fg: '#2a2213' }, // wheat
  { bg: '#141e22', fg: '#e3c98b' }, // ink
  { bg: '#68715b', fg: '#f8f3e8' }, // muted olive
  { bg: '#a6522f', fg: '#fff8f0' }, // terracotta
  { bg: '#4c5540', fg: '#f1ece0' }, // deep moss
  { bg: '#b7823b', fg: '#2a2213' }, // amber
];

// Simple, stable string hash (FNV-1a) → non-negative integer.
function hashKey(value) {
  let hash = 0x811c9dc5;
  const text = String(value || 'reader');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// A stable identity key for a user object. Prefer immutable ids so the avatar
// never shifts when the display name or email changes.
export function avatarKey(user) {
  return String(user?.id || user?._id || user?.username || user?.email || user?.name || 'reader');
}

// The initial shown inside the fallback avatar.
export function avatarInitial(user) {
  const source = user?.username || user?.name || user?.email || 'R';
  const letter = String(source).trim().charAt(0);
  return (letter || 'R').toUpperCase();
}

// Deterministic colour pair for a user's fallback avatar.
export function avatarColors(user) {
  return PALETTE[hashKey(avatarKey(user)) % PALETTE.length];
}
