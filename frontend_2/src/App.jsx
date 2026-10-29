import { useEffect, useRef, useState } from 'react';
import BookCard from './components/BookCard.jsx';
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
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';

const books = [
  {
    title: 'The Midnight Library',
    author: 'Matt Haig',
    price: '₹320',
    genre: 'Fiction',
    state: 'Like new',
    cover: 'https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg?default=false',
    coverFallback: '/covers/midnight.svg',
    note: 'A second chance, between the shelves',
  },
  {
    title: 'The Secret Garden',
    author: 'Frances Hodgson Burnett',
    price: '₹180',
    genre: 'Classics',
    state: 'Loved well',
    cover: 'https://covers.openlibrary.org/b/isbn/9781464301971-L.jpg?default=false',
    coverFallback: '/covers/garden.svg',
    note: 'A classic ready for a new reader',
  },
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    price: '₹280',
    genre: 'Non-fiction',
    state: 'Very good',
    cover: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg?default=false',
    coverFallback: '/covers/atomic.svg',
    note: 'Small changes, remarkable results',
  },
  {
    title: 'Pride & Prejudice',
    author: 'Jane Austen',
    price: '₹210',
    genre: 'Classics',
    state: 'Like new',
    cover: 'https://covers.openlibrary.org/b/isbn/9780192815033-L.jpg?default=false',
    coverFallback: '/covers/pride.svg',
    note: 'A little wit never goes out of style',
  },
  {
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    price: '₹350',
    genre: 'Fantasy',
    state: 'Very good',
    cover: 'https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg?default=false',
    coverFallback: '/covers/hobbit.svg',
    note: 'An unexpected journey awaits',
  },
  {
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    price: '₹220',
    genre: 'Mystery',
    state: 'Very good',
    cover: 'https://covers.openlibrary.org/b/isbn/9780140439072-L.jpg?default=false',
    coverFallback: '/covers/sherlock.svg',
    note: 'A clever mystery for a rainy day',
  },
];
const questions = [
  [
    'Can I buy a book from this page?',
    'This page is a visual preview with sample listings. You can add a title to the local book bag, but checkout and delivery are not connected.',
  ],
  [
    'Can I propose a book exchange?',
    'The swap labels are examples only. Exchange proposals are not available in this preview.',
  ],
  [
    'Can I list one of my books?',
    'Listing creation is not available on this page. The books shown here are sample content.',
  ],
  [
    'Are the conditions and photos real?',
    'The conditions and listing details are sample content. Book covers are sourced from Open Library and may differ by edition.',
  ],
  [
    'Are the saved books and bag kept?',
    'No. These controls work only in this browser page and reset when it reloads.',
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
  const [showAll, setShowAll] = useState(false);
  const [bag, setBag] = useState([]);
  const [saved, setSaved] = useState([]);
  const [faq, setFaq] = useState(0);
  const [panel, setPanel] = useState('');
  const [toast, setToast] = useState('');
  const track = useRef(null);
  const heroVideoRef = useRef(null);
  const [carousel, setCarousel] = useState({ previous: false, next: false });

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
  }, [showAll, searchQuery]);
  const scrollBooks = (direction) =>
    track.current?.scrollBy({
      left: direction * Math.max(280, track.current.clientWidth * 0.8),
      behavior: 'smooth',
    });
  const browseAll = () => {
    setShowAll(true);
    setSearchQuery('');
    document.querySelector('#shelf')?.scrollIntoView({ behavior: 'smooth' });
  };
  const submitSearch = (event) => {
    event.preventDefault();
    setShowAll(true);
    document.querySelector('#shelf')?.scrollIntoView({ behavior: 'smooth' });
  };
  const addBook = (title) => {
    setBag((items) => [...items, title]);
    setToast(`${title} added to your local book bag`);
    window.setTimeout(() => setToast(''), 2400);
  };
  const toggleSaved = (title) =>
    setSaved((items) =>
      items.includes(title) ? items.filter((item) => item !== title) : [...items, title],
    );
  const showListingInfo = () => {
    setFaq(2);
    document.querySelector('#faq')?.scrollIntoView({ behavior: 'smooth' });
  };
  const nav = [
    ['Home', '#top'],
    ['Browse books', '#shelf', browseAll],
    ['List a book', '#faq', showListingInfo],
    ['Community', '#community', () => setPanel('community')],
    ['Wishlist', '#wishlist', () => setPanel('saved')],
    ['Profile', '#profile', () => setPanel('profile')],
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
          <a href="#shelf" onClick={browseAll}>Browse books</a>
          <a href="#faq" onClick={showListingInfo}>List a book</a>
          <button className="community-nav-button" type="button" onClick={() => setPanel('community')}>Community</button>
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
          <button
            className="bag-link"
            onClick={() => setPanel('bag')}
            aria-label={`Open book bag, ${bag.length} books`}
          >
            <ShoppingBag size={19} aria-hidden="true" />
            <span>{bag.length}</span>
          </button>
          <button
            className="header-icon-button wishlist-link"
            onClick={() => setPanel('saved')}
            aria-label={`Open wishlist, ${saved.length} saved books`}
            title="Wishlist"
          >
            <Heart size={19} aria-hidden="true" />
            <span>{saved.length}</span>
          </button>
          <button
            className="header-icon-button profile-link"
            onClick={() => setPanel('profile')}
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
            <p>Browse sample books and see how the reader-to-reader idea could work.</p>
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
                setPanel('saved');
              }}
            >
              View wishlist ({saved.length}) <Heart size={16} aria-hidden="true" />
            </button>
          </section>
        </div>
      )}

      {panel && (
        <div
          className="menu-backdrop panel-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && setPanel('')}
        >
          <section
            className="menu-panel book-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
          >
            <button className="menu-close" onClick={() => setPanel('')} aria-label="Close panel">
              <X size={22} />
            </button>
            <span className="eyebrow">YOUR BROWSER SESSION</span>
            <h2 id="panel-title">
              {panel === 'bag' ? 'Your book bag' : panel === 'profile' ? 'Reader profile' : panel === 'community' ? 'The BetterReads community' : 'Wishlist'}
            </h2>
            <p>
              {panel === 'bag'
                ? 'A temporary list of sample books you added on this page.'
                : panel === 'profile'
                  ? 'You are browsing as a guest. Profiles and accounts are not available in this preview.'
                  : panel === 'community'
                    ? 'BetterReads is a reader-to-reader concept. Community profiles, messages, meetups, and event signups are not available in this preview.'
                    : 'A temporary wishlist of books you saved on this page.'}
            </p>
            {panel !== 'profile' && panel !== 'community' && <div className="panel-books">
              {(panel === 'bag' ? bag : saved).length ? (
                (panel === 'bag' ? bag : saved).map((title, index) => {
                  const book = books.find((item) => item.title === title);
                  return (
                    <article key={`${title}-${index}`}>
                      <img src={book.cover} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = book.coverFallback; }} />
                      <div>
                        <strong>{book.title}</strong>
                        <span>{book.price} · sample listing</span>
                      </div>
                      <button
                        onClick={() =>
                          panel === 'bag'
                            ? setBag((items) => items.filter((_, itemIndex) => itemIndex !== index))
                            : setSaved((items) => items.filter((item) => item !== title))
                        }
                        aria-label={`Remove ${book.title}`}
                      >
                        <X size={17} />
                      </button>
                    </article>
                  );
                })
              ) : (
                <p className="panel-empty">
                  {panel === 'bag'
                    ? 'Your bag is empty. Browse the sample books to add one.'
                    : 'No saved books yet. Tap a heart on a sample listing to keep it here.'}
                </p>
              )}
            </div>}
            {panel === 'profile' && (
              <p className="panel-note">Wishlist and book bag items are temporary and stay in this browser session.</p>
            )}
            {panel === 'bag' && (
              <p className="panel-note">Checkout and delivery are not connected in this preview.</p>
            )}
            <button
              className="button button-red menu-cta"
              onClick={() => {
                setPanel('');
                browseAll();
              }}
            >
              Browse sample books <ArrowRight size={16} />
            </button>
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
                Find a story that stays with you. Save a favourite or add a sample listing to your
                bag. Every book deserves another chapter.
              </p>
              <div className="hero-buttons">
                <button className="button button-wheat" onClick={browseAll}>
                  BROWSE SAMPLE BOOKS <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </div>
          <a className="hero-down" href="#shelf" aria-label="Scroll to sample books">
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
              <p>Browse a small collection of sample reader listings.</p>
            </div>
            <button className="text-link" onClick={browseAll}>
              EXPLORE ALL {books.length} SAMPLE BOOKS <ArrowRight size={16} />
            </button>
          </div>
          <div className="shelf-toolbar">
            <div>
              <strong>
                {normalizedSearch
                  ? 'SEARCH RESULTS'
                  : showAll
                    ? 'ALL SAMPLE BOOKS'
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
            aria-label="Sample book listings"
          >
            {shown.length ? (
              shown.map((book, index) => (
                <BookCard
                  key={book.title}
                  book={book}
                  index={index}
                  saved={saved.includes(book.title)}
                  inBag={bag.includes(book.title)}
                  onSave={() => toggleSaved(book.title)}
                  onAdd={() => addBook(book.title)}
                />
              ))
            ) : (
              <p className="empty-shelf">
                No sample books match your search.{' '}
                <button onClick={browseAll}>Show all books</button>
              </p>
            )}
          </div>
          <div className="shelf-foot">
            <span>SAMPLE LISTINGS · NO CHECKOUT</span>
            <span>Bag and saved book changes last for this page session.</span>
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
            <p>This is a frontend preview with illustrative listings.</p>
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
                Browse sample books <ArrowUpRight size={14} />
              </button>
            </p>
          </div>
          <nav className="footer-links" aria-label="Browse BetterReads">
            <span className="eyebrow pale">FIND YOUR WAY</span>
            <a href="#shelf" onClick={browseAll}>
              All sample books
            </a>
            <a href="#faq">Questions</a>
          </nav>
          <div className="footer-links">
            <span className="eyebrow pale">YOUR READING LIST</span>
            <button onClick={() => setPanel('saved')}>Saved books ({saved.length})</button>
            <button onClick={() => setPanel('bag')}>Book bag ({bag.length})</button>
            <a href="#top">
              Back to the top <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} BetterReads · Sample frontend preview.</span>
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


