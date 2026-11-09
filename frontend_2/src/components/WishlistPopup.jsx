import { appPath } from '../services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { Heart, X } from 'lucide-react';
import AccountPanel from './AccountPanel.jsx';
import WishlistButton from './WishlistButton.jsx';
import useReader from '../services/useReader.js';
import { api, localGet, photoUrl } from '../services/api.js';
import { exampleBooks } from '../exampleBooks.js';

// Heart trigger in the navbar that opens the wishlist as a floating dialog,
// mirroring the messages/requests inbox popup rather than a full page.
export default function WishlistPopup() {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  const opener = useRef(null);
  const { user, loading, refresh } = useReader();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const examples = exampleBooks.filter((book) => localGet('betterreads.wishlist', []).includes(book.title));
  const count = items.length + examples.length;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('openWishlist')) {
      openPopup();
      params.delete('openWishlist');
      const query = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
    }
    const show = () => openPopup();
    window.addEventListener('betterreads:open-wishlist', show);
    return () => window.removeEventListener('betterreads:open-wishlist', show);
  }, []);

  useEffect(() => { if (open && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [open]);

  useEffect(() => {
    let active = true;
    if (!user) { setItems([]); return () => { active = false; }; }
    api('/api/wishlist').then((data) => { if (active) setItems(data.wishlist || []); }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [user, version, open]);

  useEffect(() => {
    const update = () => setVersion((n) => n + 1);
    window.addEventListener('betterreads:local-change', update);
    return () => window.removeEventListener('betterreads:local-change', update);
  }, []);

  function openPopup() { opener.current = document.activeElement; setError(''); setOpen(true); }
  function close() { if (dialog.current?.open) dialog.current.close(); setOpen(false); opener.current?.focus?.(); }

  return (
    <>
      <button
        type="button"
        className="header-icon-button wishlist-link"
        onClick={(event) => { opener.current = event.currentTarget; openPopup(); }}
        aria-label={`Wishlist${count ? `, ${count} saved` : ''}`}
        title="Wishlist"
      >
        <Heart size={19} aria-hidden="true" />
        {count > 0 && <span>{count > 99 ? '99+' : count}</span>}
      </button>
      {open && (
        <dialog ref={dialog} className="floating-inbox floating-wishlist" aria-labelledby="floating-wishlist-title" onCancel={(event) => { event.preventDefault(); close(); }}>
          <header className="floating-inbox-header">
            <h2 id="floating-wishlist-title">Saved for later</h2>
            <div>
              <button type="button" onClick={close} aria-label="Close wishlist"><X size={20} /></button>
            </div>
          </header>
          <div className="floating-wishlist-body">
            {loading ? (
              <p role="status">Loading your account…</p>
            ) : !user ? (
              <div className="wishlist-signin">
                <p>Log in to keep a wishlist of reader listings across your devices.</p>
                <AccountPanel onAuthenticated={refresh} />
              </div>
            ) : error ? (
              <p role="alert" className="account-error">{error}</p>
            ) : !count ? (
              <div className="wishlist-empty">
                <span className="wishlist-empty-icon"><Heart size={26} aria-hidden="true" /></span>
                <h3>Nothing saved yet</h3>
                <p>Tap the heart on any book to keep it here for later.</p>
                <a className="button button-red" href={appPath('/books')}>Browse books</a>
              </div>
            ) : (
              <ul className="wishlist-items">
                {items.map((book) => (
                  <li className="wishlist-item" key={book._id}>
                    <a className="wishlist-item-cover" href={appPath(`/books/${book._id}`)}>
                      <img src={book.photos?.[0] ? photoUrl(book.photos[0]) : appPath('/covers/placeholder.svg')} alt="" />
                    </a>
                    <div className="wishlist-item-body">
                      <a href={appPath(`/books/${book._id}`)}><strong>{book.title}</strong></a>
                      <span>{book.author || 'Unknown author'}{book.location?.city ? ` · ${book.location.city}` : ''}</span>
                    </div>
                    <WishlistButton bookId={book._id} className="wishlist-remove" onSignIn={refresh} onChange={() => setVersion((n) => n + 1)} />
                  </li>
                ))}
                {examples.map((book) => (
                  <li className="wishlist-item" key={book.title}>
                    <a className="wishlist-item-cover" href={appPath(`/books/example/${encodeURIComponent(book.title)}`)}>
                      <img src={book.cover} alt="" />
                    </a>
                    <div className="wishlist-item-body">
                      <a href={appPath(`/books/example/${encodeURIComponent(book.title)}`)}><strong>{book.title}</strong></a>
                      <span>Example book · saved in this browser</span>
                    </div>
                    <WishlistButton bookId={book.title} example className="wishlist-remove" onChange={() => setVersion((n) => n + 1)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
