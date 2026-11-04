import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import BookCard from './components/BookCard.jsx';
import Navbar from './components/Navbar.jsx';
import { getAllBooks, localGet, localSet, photoUrl } from './services/api.js';

const emptyFilters = { type: '', genre: '', authors: [], condition: '', availability: '', city: '' };
const types = ['Fiction', 'Non-fiction', 'Academic', 'Comics/Manga', 'Biography', 'Self-help', 'Other'];
const genres = ['Fantasy', 'Mystery', 'Romance', 'Thriller', 'Science Fiction', 'History', 'Philosophy', 'Technology', 'Other'];
const text = (value) => String(value || '').toLocaleLowerCase();

export default function CatalogPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, city: localGet('betterreads.city', '') }));
  const [draft, setDraft] = useState(filters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [authorSearch, setAuthorSearch] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [sort, setSort] = useState('newest');
  const [reload, setReload] = useState(0);
  const [notice] = useState(() => sessionStorage.getItem('betterreads.listingCreated') === '1');
  useEffect(() => { if (notice) sessionStorage.removeItem('betterreads.listingCreated'); }, [notice]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    getAllBooks('&status=available', controller.signal).then(setBooks)
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  const authors = [...new Set(books.map((book) => book.author).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const cities = [...new Set(books.map((book) => book.location?.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const query = text(search.trim());
  const matches = books.filter((book) => {
    const genre = text(book.genre); const type = text(book.bookType); const city = text(book.location?.city);
    return (!query || [book.title, book.author, book.genre].some((value) => text(value).includes(query))) &&
      (!filters.genre || (filters.genre === 'Other' ? genre && !genres.slice(0, -1).some((g) => text(g) === genre) : genre === text(filters.genre))) &&
      (!filters.type || (filters.type === 'Other' ? type && !types.slice(0, -1).some((t) => text(t) === type) : type === text(filters.type))) &&
      (!filters.condition || text(book.condition) === text(filters.condition)) &&
      (!filters.authors.length || filters.authors.includes(book.author)) &&
      (!filters.city || city === text(filters.city.trim())) &&
      (!filters.availability || (filters.availability === 'exchange' ? book.barterAvailable : filters.availability === 'borrow' ? book.borrowAvailable === true : book.meetupAvailable === true));
  }).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'relevance' && query ? Number(text(b.title).startsWith(query)) - Number(text(a.title).startsWith(query)) : new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const active = [filters.type, filters.genre, ...filters.authors, filters.condition, filters.availability && ({ exchange: 'Exchange', borrow: 'Borrowing', meetup: 'Meetup' }[filters.availability]), filters.city].filter(Boolean);
  function apply() { setFilters(draft); localSet('betterreads.city', draft.city.trim()); setFilterOpen(false); }
  function clear() { setFilters(emptyFilters); setDraft(emptyFilters); localSet('betterreads.city', ''); setAuthorSearch(''); }
  function detectLocation() {
    setLocationMessage('');
    if (!navigator.geolocation) { setLocationMessage('Location is unavailable. Enter a city instead.'); return; }
    navigator.geolocation.getCurrentPosition(() => setLocationMessage('Location detected. City lookup is not configured, so please enter your city.'), () => setLocationMessage('Location permission was not granted. Enter a city instead.'), { timeout: 10000, maximumAge: 300000 });
  }
  return <div className="catalog-page"><Navbar /><main className="catalog-main">
    <div className="catalog-heading"><div><span className="eyebrow">FROM ONE READER TO ANOTHER</span><h1>Find your <em>next chapter.</em></h1><p>Explore books listed by readers.</p></div><a className="button button-red" href="/list-book">List a book <span aria-hidden="true">↗</span></a></div>
    {notice && <p className="catalog-notice" role="status">Your book has been listed.</p>}
    <div className="catalog-toolbar"><label className="catalog-search"><Search size={19} aria-hidden="true" /><span className="visually-hidden">Search listings</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search books, authors, genres..." /></label><button type="button" className="detail-secondary" aria-expanded={filterOpen} aria-controls="book-filters" onClick={() => { setDraft(filters); setFilterOpen(!filterOpen); }}><SlidersHorizontal size={16} /> Filters {active.length > 0 && `(${active.length})`}</button><div className="location-selector"><button type="button" className="detail-secondary" aria-expanded={locationOpen} aria-controls="catalog-location" onClick={() => setLocationOpen(!locationOpen)}><MapPin size={16} /> {filters.city || 'All locations'}</button>{locationOpen && <div id="catalog-location" className="location-popover"><label>City or area<input list="location-cities" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Search for a city" /></label><datalist id="location-cities">{cities.map((city) => <option key={city} value={city} />)}</datalist><button type="button" className="text-link" onClick={detectLocation}>Use my location</button><button type="button" className="text-link" onClick={() => { const next = { ...filters, city: '' }; setFilters(next); setDraft(next); localSet('betterreads.city', ''); setLocationOpen(false); }}>All locations</button><button type="button" className="button button-red" onClick={() => { const next = { ...filters, city: draft.city.trim() }; setFilters(next); setDraft(next); localSet('betterreads.city', next.city); setLocationOpen(false); }}>Apply location</button>{locationMessage && <small role="status">{locationMessage}</small>}</div>}</div><label className="catalog-sort">Sort <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest</option><option value="title">Title</option><option value="relevance">Relevance</option></select></label><span aria-live="polite">{loading ? 'Loading…' : `${matches.length} ${matches.length === 1 ? 'book' : 'books'}`}</span></div>
    {filterOpen && <section id="book-filters" className="filters-panel" aria-label="Book filters"><div className="filters-grid"><label>Book type<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option value="">All types</option>{types.map((v) => <option key={v}>{v}</option>)}</select></label><label>Genre<select value={draft.genre} onChange={(e) => setDraft({ ...draft, genre: e.target.value })}><option value="">All genres</option>{genres.map((v) => <option key={v}>{v}</option>)}</select></label><label>Condition<select value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value })}><option value="">All conditions</option>{['New', 'Like New', 'Good', 'Fair', 'Used'].map((v) => <option key={v}>{v}</option>)}</select></label><label>Availability<select value={draft.availability} onChange={(e) => setDraft({ ...draft, availability: e.target.value })}><option value="">All books</option><option value="exchange">Exchange</option><option value="borrow">Borrowing</option><option value="meetup">Meetup/handover</option></select></label><label>City or area<input list="book-cities" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="All locations" /><datalist id="book-cities">{cities.map((city) => <option key={city} value={city} />)}</datalist></label><div className="filter-location"><button type="button" className="text-link" onClick={detectLocation}><MapPin size={15} /> Use my location</button><small>City lookup is not configured; choose a city manually.</small>{locationMessage && <small role="status">{locationMessage}</small>}</div></div><fieldset className="filter-authors"><legend>Authors</legend><input aria-label="Find an author" value={authorSearch} onChange={(e) => setAuthorSearch(e.target.value)} placeholder="Find an author" /><div>{authors.filter((name) => text(name).includes(text(authorSearch))).map((name) => <label key={name}><input type="checkbox" checked={draft.authors.includes(name)} onChange={() => setDraft({ ...draft, authors: draft.authors.includes(name) ? draft.authors.filter((a) => a !== name) : [...draft.authors, name] })} /> {name}</label>)}</div></fieldset><p className="detail-note">Type, borrowing and meetup filters only match listings that provide those details.</p><div className="filter-actions"><button type="button" className="button button-red" onClick={apply}>Apply filters</button><button type="button" className="detail-secondary" onClick={clear}>Clear all</button></div></section>}
    {active.length > 0 && <div className="active-filters" aria-label="Active filters">{active.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}<button type="button" onClick={clear}>Clear all</button></div>}
    {loading ? <p role="status">Loading available books…</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="text-link" onClick={() => setReload((n) => n + 1)}>Try again</button></div> : matches.length ? <div className="catalog-grid">{matches.map((book, index) => <BookCard key={book._id} index={index} book={{ id: book._id, title: book.title, author: book.author, genre: book.genre, barterAvailable: book.barterAvailable, borrowAvailable: book.borrowAvailable, state: book.condition, location: book.location?.city, note: book.description || `By ${book.author || 'a reader'}`, cover: book.photos?.[0] ? photoUrl(book.photos[0]) : '/covers/placeholder.svg', coverFallback: '/covers/placeholder.svg' }} />)}</div> : <div className="catalog-empty"><p>{query || active.length ? 'No books match these filters.' : 'No books have been listed yet.'}</p><button type="button" className="text-link" onClick={() => { setSearch(''); clear(); }}>Show all books</button></div>}
  </main></div>;
}

