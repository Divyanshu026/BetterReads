import { useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import BookCard from './components/BookCard.jsx';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const photoUrl = (url) => url.startsWith('/uploads/') ? apiBase + url : url;

export default function CatalogPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [reload, setReload] = useState(0);
  const [notice] = useState(() => sessionStorage.getItem('betterreads.listingCreated') === '1');

  useEffect(() => { if (notice) sessionStorage.removeItem('betterreads.listingCreated'); }, [notice]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError('');
      try {
        const items = [];
        let page = 1;
        let total = 0;
        do {
          const response = await fetch(`${apiBase}/api/books?status=available&limit=100&page=${page}`, { signal: controller.signal });
          if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Unable to load listings. Please try again.');
          const data = await response.json();
          if (!Array.isArray(data)) throw new Error('Unable to load listings. Please try again.');
          items.push(...data);
          total = Number(response.headers.get('X-Total-Count') || data.length);
          if (!data.length) break;
          page += 1;
        } while (items.length < total);
        setBooks(items);
      } catch (err) { if (err.name !== 'AbortError') setError(err.message || 'Unable to load listings. Please try again.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [reload]);

  const query = search.trim().toLocaleLowerCase();
  const matches = books.filter((book) => [book.title, book.author, book.genre].some((value) => String(value || '').toLocaleLowerCase().includes(query)));

  return (
    <div className="catalog-page">
      <header className="listing-page-header">
        <a className="brand" href="/" aria-label="BetterReads home"><img className="brand-icon" src="/betterreads-reader.png" alt="" /><span className="brand-name">BETTERREADS<small>BOOKS · NEW BEGINNINGS</small></span></a>
        <a className="listing-back" href="/"><ArrowLeft size={17} aria-hidden="true" /> Back to home</a>
      </header>
      <main className="catalog-main">
        <div className="catalog-heading"><div><span className="eyebrow">FROM ONE READER TO ANOTHER</span><h1>Find your <em>next chapter.</em></h1><p>Explore books listed by readers.</p></div><a className="button button-red" href="/list-book">List a book <span aria-hidden="true">↗</span></a></div>
        {notice && <p className="catalog-notice" role="status">Your book has been listed.</p>}
        <div className="catalog-toolbar"><label className="catalog-search"><Search size={19} aria-hidden="true" /><span className="visually-hidden">Search listings</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search books, authors, genres..." /></label><span aria-live="polite">{loading ? 'Loading books…' : `${matches.length} ${matches.length === 1 ? 'book' : 'books'}`}</span></div>
        {loading ? <p role="status">Loading available books…</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="text-link" onClick={() => setReload((n) => n + 1)}>Try again</button></div> : matches.length ? (
          <div className="catalog-grid">{matches.map((book, index) => <BookCard key={book._id} index={index} book={{ id: book._id, title: book.title, state: book.condition, note: book.description || `By ${book.author || 'a reader'}`, cover: book.photos?.[0] ? photoUrl(book.photos[0]) : '/covers/placeholder.svg', coverFallback: '/covers/placeholder.svg' }} />)}</div>
        ) : <div className="catalog-empty"><p>{query ? 'No books match your search.' : 'No books have been listed yet.'}</p>{query ? <button type="button" className="text-link" onClick={() => setSearch('')}>Clear search</button> : <a className="text-link" href="/list-book">List a book</a>}</div>}
      </main>
    </div>
  );
}

