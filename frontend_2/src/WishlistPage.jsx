import { useEffect, useState } from 'react';
import PageShell from './components/PageShell.jsx';
import AccountPanel from './components/AccountPanel.jsx';
import WishlistButton from './components/WishlistButton.jsx';
import useReader from './services/useReader.js';
import { api, localGet, photoUrl } from './services/api.js';
import { exampleBooks } from './exampleBooks.js';

export default function WishlistPage() {
  const { user, loading, refresh } = useReader();
  const [items, setItems] = useState([]); const [error, setError] = useState(''); const [version, setVersion] = useState(0);
  useEffect(() => { let active = true; if (user) api('/api/wishlist').then((data) => { if (active) setItems(data.wishlist || []); }).catch((err) => { if (active) setError(err.message); }); else setItems([]); return () => { active = false; }; }, [user, version]);
  useEffect(() => { const update = () => setVersion((n) => n + 1); window.addEventListener('betterreads:local-change', update); return () => window.removeEventListener('betterreads:local-change', update); }, []);
  const examples = exampleBooks.filter((book) => localGet('betterreads.wishlist', []).includes(book.title));
  return <PageShell><main className="social-page"><span className="eyebrow">YOUR READING LIST</span><h1>Saved for later.</h1><p>Keep the stories you want to return to.</p>{loading ? <p role="status">Loading your account…</p> : <>{error && <p role="alert">{error}</p>}{!items.length && !examples.length && <p>No saved books yet. <a href="/books">Browse books</a></p>}<div className="saved-list">{items.map((book) => <article className="saved-item" key={book._id}><img src={book.photos?.[0] ? photoUrl(book.photos[0]) : '/covers/placeholder.svg'} alt="" /><div><h2><a href={`/books/${book._id}`}>{book.title}</a></h2><p>{book.author || 'Unknown author'} · {book.location?.city || 'Location not provided'}</p><WishlistButton bookId={book._id} onSignIn={refresh} onChange={() => setVersion((n) => n + 1)} /></div></article>)}{examples.map((book) => <article className="saved-item" key={book.title}><img src={book.cover} alt="" /><div><h2><a href={`/books/example/${encodeURIComponent(book.title)}`}>{book.title}</a></h2><p>Example book · saved in this browser</p><WishlistButton bookId={book.title} example /></div></article>)}</div>{!user && <div className="social-surface profile-edit"><h2>Log in to save reader listings</h2><AccountPanel onAuthenticated={refresh} /></div>}</>}</main></PageShell>;
}

