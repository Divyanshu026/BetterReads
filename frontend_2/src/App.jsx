import { useEffect, useRef, useState } from 'react';
import BookCard from './components/BookCard.jsx';
import AccountPanel from './components/AccountPanel.jsx';
import InboxLink from './components/InboxLink.jsx';
import { exampleBooks } from './exampleBooks.js';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Menu,
  Plus,
  Search,
  UserRound,
  X,
} from 'lucide-react';


const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const readSessionList = (key) => { try { const data = JSON.parse(sessionStorage.getItem(key) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } };
const bookKey = (book) => book.id || book.title;
const listingPhoto = (url) => url.startsWith('/uploads/') ? apiBase + url : url;
const mapListing = (book) => ({
  id: book._id,
  title: book.title,
  author: book.author || 'Unknown author',
  genre: book.genre || 'General',
  state: book.condition,
  price: `₹${(book.priceCents / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
  cover: book.photos?.[0] ? listingPhoto(book.photos[0]) : '/covers/placeholder.svg',
  photos: (book.photos || []).map(listingPhoto),
  coverFallback: '/covers/placeholder.svg',
  note: book.description || 'A book ready for its next reader',
});
const questions = [
  [
    'How do I request a book?',
    'Open a reader listing and select Request exchange to message its owner.',
  ],
  [
    'Can I propose a book exchange?',
    'Open a reader listing and send an exchange request to start a conversation.',
  ],
  [
    'Can I list one of my books?',
    'Log in and choose List a book to create a listing.' ,
  ],
  [
    'Are the conditions and photos real?',
    'Listings marked as examples use illustrative details. Reader listings are provided by their owners.',
  ],
  [
    'Are saved books kept?',
    'Your saved books stay in this browser tab for the duration of the session.',
  ],
];

function Brand({ light = false }) {
  return (
    <a className={`brand ${light ? 'light' : ''}`} href="#top" aria-label="BetterReads home">
      <img className="brand-icon" src="/betterreads-reader.png" alt="" />
      <span className="brand-name">
        BETTERREADS<small>BOOKS · NEW BEGINNINGS</small>
      </span>
    </a>
  );
}

export default function App() {
  const [menu, setMenu] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveBooks, setLiveBooks] = useState([]);
  const [listingError, setListingError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [saved, setSaved] = useState(() => readSessionList('betterreads.saved'));
  const [faq, setFaq] = useState(0);
  const [panel, setPanel] = useState('');
  const [toast, setToast] = useState('');
  const track = useRef(null);
  const heroVideoRef = useRef(null);
  const [carousel, setCarousel] = useState({ previous: false, next: false });

  useEffect(() => { sessionStorage.setItem('betterreads.saved', JSON.stringify(saved)); }, [saved]);

  useEffect(() => {
    if (sessionStorage.getItem('betterreads.listingCreated')) {
      sessionStorage.removeItem('betterreads.listingCreated');
      setToast('Your book has been listed.');
    }
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menu || Boolean(panel));
    return () => document.body.classList.remove('menu-open');
  }, [menu, panel]);
  useEffect(() => {
    let previousY = window.scrollY;
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (menu || panel || currentY <= 80 || currentY < previousY - 2) {
        setHeaderHidden(false);
      } else if (currentY > previousY + 2 && currentY > 100) {
        setHeaderHidden(true);
      }
      previousY = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [menu, panel]);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPlayback = () => {
      if (reducedMotion.matches) {
        video.pause();
        return;
      }
      video.play().catch(() => {});
    };

    syncPlayback();
    reducedMotion.addEventListener('change', syncPlayback);
    return () => {
      reducedMotion.removeEventListener('change', syncPlayback);
      video.pause();
    };
  }, []);

  useEffect(() => {
    if (!menu && !panel) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenu(false);
        setPanel('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menu, panel]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadListings() {
      try {
        const listings = [];
        let page = 1;
        let total = 0;
        do {
          const response = await fetch(`${apiBase}/api/books?status=available&limit=100&page=${page}`, { signal: controller.signal });
          if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Unable to load reader listings.');
          const data = await response.json();
          if (!Array.isArray(data)) throw new Error('Unable to load reader listings.');
          listings.push(...data.map(mapListing));
          total = Number(response.headers.get('X-Total-Count') || data.length);
          if (data.length === 0) break;
          page += 1;
        } while (listings.length < total);
        setLiveBooks(listings);
        setListingError('');
      } catch (error) {
        if (error.name !== 'AbortError') setListingError('Reader listings are unavailable right now.');
      }
    }
    loadListings();
    return () => controller.abort();
  }, []);
  const books = [...liveBooks, ...exampleBooks];
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      !normalizedSearch ||
      `${book.title} ${book.author} ${book.genre}`.toLocaleLowerCase().includes(normalizedSearch);
    return matchesSearch;
  });
  const shown =
    !showAll && !normalizedSearch
      ? filteredBooks.slice(0, 4)
      : filteredBooks;
  const updateCarousel = () => {
    const element = track.current;
    if (!element) return;
    setCarousel({
      previous: element.scrollLeft > 2,
      next: element.scrollLeft + element.clientWidth < element.scrollWidth - 2,
    });
  };
  useEffect(() => {
    updateCarousel();
    window.addEventListener('resize', updateCarousel);
    return () => window.removeEventListener('resize', updateCarousel);
  }, [showAll, searchQuery, liveBooks]);
  const scrollBooks = (direction) =>
    track.current?.scrollBy({
      left: direction * Math.max(280, track.current.clientWidth * 0.8),
      behavior: 'smooth',
    });
  const browseAll = () => window.location.assign('/books');
  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    window.location.assign(query ? `/books?q=${encodeURIComponent(query)}` : '/books');
  };
  const nav = [
    ['Home', '#top'],
    ['Browse books', '/books'],
    ['List a book', '/list-book'],
    ['Community', '/community'],
    ['Wishlist', '/wishlist'],
    ['Messages & requests', '/inbox'],
    ['Profile', '/readers/me'],
    ['Questions', '#faq'],
  ];

  return (
    <div id="top">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={`site-header ${headerHidden ? 'header-hidden' : ''}`}>
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#top">Home</a>
          <a href="/books">Browse books</a>
          <a href="/list-book">List a book</a>
          <a href="/community">Community</a>
        </nav>
        <form className="header-search" role="search" onSubmit={submitSearch}>
          <Search size={19} aria-hidden="true" />
          <label className="visually-hidden" htmlFor="header-book-search">
            Search books, authors, and genres
          </label>
          <input
            id="header-book-search"
            type="search"
            placeholder="Search books, authors..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </form>
        <div className="header-actions">
          <InboxLink />
          <a className="header-icon-button wishlist-link" href="/wishlist" aria-label="Open wishlist" title="Wishlist"><Heart size={19} aria-hidden="true" /></a>
          <button
            className="header-icon-button profile-link"
            onClick={() => window.location.assign('/readers/me')}
            aria-label="Open reader profile"
            title="Profile"
          >
            <UserRound size={19} aria-hidden="true" />
          </button>
          <button
            className="menu-trigger"
            onClick={() => setMenu(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {menu && (
        <div
          className="menu-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && setMenu(false)}
        >
          <section
            className="menu-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-title"
          >
            <button
              className="menu-close"
              onClick={() => setMenu(false)}
              aria-label="Close navigation menu"
            >
              <X size={22} />
            </button>
            <span className="eyebrow">A GOOD PLACE TO BEGIN</span>
            <h2 id="menu-title">Explore BetterReads</h2>
            <p>Find your next read and keep track of the books you love.</p>
            <nav aria-label="Mobile navigation">
              {nav.map(([label, href, action]) => (
                <a
                  href={href}
                  key={label}
                  onClick={(event) => {
                    if (action) event.preventDefault();
                    setMenu(false);
                    action?.();
                  }}
                >
                  {label}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              ))}
            </nav>
            <button
              className="button button-red menu-cta"
              onClick={() => {
                setMenu(false);
                window.location.assign('/wishlist');
              }}
            >
              View wishlist <Heart size={16} aria-hidden="true" />
            </button>
          </section>
        </div>
      )}

      {panel && (
        <div
          className={`menu-backdrop panel-backdrop ${panel === 'profile' ? 'account-backdrop' : ''}`}
          onMouseDown={(event) => event.target === event.currentTarget && setPanel('')}
        >
          <section
            className={`menu-panel book-panel ${panel === 'profile' ? 'account-dialog' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
          >
            <button className="menu-close" onClick={() => setPanel('')} aria-label="Close panel">
              <X size={22} />
            </button>
            <span className="eyebrow">YOUR BROWSER SESSION</span>
            <h2 id="panel-title">
              {panel === 'profile' ? 'Reader profile' : panel === 'community' ? 'The BetterReads community' : 'Wishlist'}
            </h2>
            {panel !== 'profile' && <p>
              {panel === 'community'
                    ? 'Community profiles, messages, meetups, and event signups are not available yet.'
                    : 'Books you saved in this browser session.'}
            </p>}
            {panel !== 'profile' && panel !== 'community' && <div className="panel-books">
              {saved.length ? (
                saved.map((title, index) => {
                  const book = books.find((item) => bookKey(item) === title);
                  if (!book) return null;
                  return (
                    <article key={`${title}-${index}`}>
                      <img src={book.cover} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = book.coverFallback; }} />
                      <div>
                        <strong>{book.title}</strong>
                        <span>{book.price}</span>
                      </div>
                      <button
                        onClick={() => setSaved((items) => items.filter((item) => item !== title))}
                        aria-label={`Remove ${book.title}`}
                      >
                        <X size={17} />
                      </button>
                    </article>
                  );
                })
              ) : (
                <p className="panel-empty">
                  No saved books yet. Save a book from its details page to keep it here.
                </p>
              )}
            </div>}
            {panel === 'profile' && (
              <AccountPanel />
            )}
            {panel !== 'profile' && <button
              className="button button-red menu-cta"
              onClick={() => {
                setPanel('');
                browseAll();
              }}
            >
              Browse books <ArrowRight size={16} />
            </button>}
          </section>
        </div>
      )}

      <main id="main">
        <section className="hero">
          <video
            ref={heroVideoRef}
            className="hero-video"
            muted
            loop
            playsInline
            preload="metadata"
            poster="/hero-reader-3d.png"
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src="/hero-reader.mp4" type="video/mp4" />
          </video>
          <div className="hero-copy">

            <div className="hero-content">
              <span className="eyebrow pale">
                <i /> STORIES FIND THEIR WAY
              </span>
              <h1>
                GOOD BOOKS.
                <br />
                <em>NEW BEGINNINGS.</em>
              </h1>
              <p>
                Find a story that stays with you. Save a favourite or request an exchange with its
                reader. Every book deserves another chapter.
              </p>
              <div className="hero-buttons">
                <button className="button button-wheat" onClick={browseAll}>
                  BROWSE BOOKS <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </div>
          <a className="hero-down" href="#shelf" aria-label="Scroll to books">
            <ArrowDown size={17} />
          </a>
          <span className="hero-caption">A quiet corner. A whole new world.</span>
        </section>

        <section className="section shelf-section" id="shelf">
          <div className="section-topline">
            <span className="eyebrow">FROM ONE READER TO ANOTHER</span>
            <i />
            <span className="eyebrow index">01 / THE SHELVES</span>
          </div>
          <div className="section-heading">
            <div>
              <h2>
                PICK YOUR
                <br />
                <em>NEXT CHAPTER.</em>
              </h2>
              <p>Find a story worth sharing.</p>
            </div>
            <button className="text-link" onClick={browseAll}>
              BROWSE ALL LISTINGS <ArrowRight size={16} />
            </button>
          </div>
          <div className="shelf-toolbar">
            <div>
              <strong>
                {normalizedSearch
                  ? 'SEARCH RESULTS'
                  : showAll
                    ? 'ALL BOOKS'
                    : 'A FEW GOOD FINDS'}
              </strong>
              <span>
                {shown.length} {shown.length === 1 ? 'book' : 'books'} · swipe or use arrows
              </span>
            </div>
            <div className="shelf-arrows">
              <button
                aria-label="Previous books"
                disabled={!carousel.previous}
                onClick={() => scrollBooks(-1)}
              >
                <ChevronLeft size={19} />
              </button>
              <button
                aria-label="Next books"
                disabled={!carousel.next}
                onClick={() => scrollBooks(1)}
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
          <div
            className="book-track"
            ref={track}
            onScroll={updateCarousel}
            aria-live="polite"
            aria-label="Book listings"
          >
            {shown.length ? (
              shown.map((book, index) => (
                <BookCard
                  key={bookKey(book)}
                  book={book}
                  index={index}
                />
              ))
            ) : (
              <p className="empty-shelf">
                No books match your search.{' '}
                <button onClick={browseAll}>Show all books</button>
              </p>
            )}
          </div>
          {listingError && <p className="listing-load-error" role="status">{listingError}</p>}
          <div className="shelf-foot">
            <span>SHELF MAY INCLUDE EXAMPLE BOOKS</span>
            <span>Saved books last for this browser session.</span>
          </div>
        </section>

        <section className="reading-art" aria-label="A quote about reading">
          <img
            src="/reading-quote-second.png"
            alt="A reader relaxes with a book in a cozy library while a cat naps nearby, beside a quote about reading by Mason Cooley."
            loading="lazy"
          />
        </section>

        <section className="section faq-section" id="faq">
          <div className="faq-intro">
            <span className="eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</span>
            <h2>
              GOOD
              <br />
              <em>QUESTIONS.</em>
            </h2>
            <p>A little more about BetterReads.</p>
            <BookOpen size={27} className="faq-book" />
          </div>
          <div className="faq-list">
            {questions.map(([question, answer], index) => (
              <div className="faq-item" key={question}>
                <button
                  aria-expanded={faq === index}
                  aria-controls={`answer-${index}`}
                  onClick={() => setFaq(faq === index ? -1 : index)}
                >
                  <span>{question}</span>
                  <Plus size={20} />
                </button>
                <div id={`answer-${index}`} hidden={faq !== index}>
                  <p>{answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div>
            <Brand light />
            <p>
              Good books deserve another chapter.
              <br />
              <button onClick={browseAll}>
                Browse books <ArrowUpRight size={14} />
              </button>
            </p>
          </div>
          <nav className="footer-links" aria-label="Browse BetterReads">
            <span className="eyebrow pale">FIND YOUR WAY</span>
            <a href="/books">
              All books
            </a>
            <a href="#faq">Questions</a>
          </nav>
          <div className="footer-links">
            <span className="eyebrow pale">YOUR READING LIST</span>
            <a href="/wishlist">Saved books</a>
            <a href="#top">
              Back to the top <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} BetterReads.</span>
          <span>READ WELL. PASS IT ON.</span>
        </div>
      </footer>
      <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">
        <Check size={16} />
        {toast}
      </div>
    </div>
  );
}








