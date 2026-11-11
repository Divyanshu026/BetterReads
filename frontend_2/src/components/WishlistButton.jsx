import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { api, isSignedIn, getWishlistIds, invalidateWishlistIds } from '../services/api.js';
import { useAuth } from '../services/AuthContext.jsx';

export default function WishlistButton({ bookId, onChange, className = 'detail-secondary', iconOnly = false }) {
  const { requireAuth } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (!isSignedIn()) { setSaved(false); return () => { active = false; }; }
    getWishlistIds().then((ids) => { if (active) setSaved(ids.has(String(bookId))); }).catch(() => { if (active) setError('Could not load wishlist.'); });
    return () => { active = false; };
  }, [bookId]);
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await api(`/api/wishlist/${encodeURIComponent(bookId)}`, { method: saved ? 'DELETE' : 'POST' });
      invalidateWishlistIds();
      setSaved((current) => !current);
      onChange?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function toggle(event) {
    event.preventDefault(); event.stopPropagation();
    // Guests get the shared auth modal; the save resumes once signed in.
    requireAuth(() => save(), { mode: 'login', prompt: 'Log in to save books to your wishlist.' });
  }
  return <span className="wishlist-control"><button type="button" className={className} aria-pressed={saved} aria-label={iconOnly ? (saved ? 'Saved to wishlist' : 'Save to wishlist') : undefined} disabled={busy} onClick={toggle}><Heart size={18} fill={saved ? 'currentColor' : 'none'} />{!iconOnly && (saved ? 'Saved' : 'Save to wishlist')}</button>{error && <small role="alert">{error}</small>}</span>;
}
