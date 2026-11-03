import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { api, getToken, localGet, localSet } from '../services/api.js';

export default function WishlistButton({ bookId, example, onSignIn, onChange, className = 'detail-secondary' }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (example || !getToken()) { setSaved(localGet('betterreads.wishlist', []).includes(bookId)); return () => { active = false; }; }
    api(`/api/wishlist/check/${encodeURIComponent(bookId)}`).then((data) => { if (active) setSaved(Boolean(data.inWishlist)); }).catch(() => { if (active) setError('Could not load wishlist.'); });
    return () => { active = false; };
  }, [bookId, example]);
  async function toggle(event) {
    event.preventDefault(); event.stopPropagation();
    if (busy) return;
    if (!example && !getToken()) { onSignIn?.(); return; }
    setBusy(true); setError('');
    try {
      if (example) {
        const list = localGet('betterreads.wishlist', []);
        localSet('betterreads.wishlist', saved ? list.filter((id) => id !== bookId) : [...new Set([...list, bookId])]);
      } else {
        await api(`/api/wishlist/${encodeURIComponent(bookId)}`, { method: saved ? 'DELETE' : 'POST' });
      }
      setSaved(!saved);
      onChange?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <span className="wishlist-control"><button type="button" className={className} aria-pressed={saved} disabled={busy} onClick={toggle}><Heart size={18} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved' : 'Save to wishlist'}</button>{error && <small role="alert">{error}</small>}</span>;
}
