import { appPath } from './services/paths.js';
import { useEffect, useRef, useState } from 'react';
import BookCard from './components/BookCard.jsx';
import AccountPanel from './components/AccountPanel.jsx';
import Navbar from './components/Navbar.jsx';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
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
const listingPhoto = (url) => url.startsWith('/uploads/') ? apiBase + url : url.startsWith('/covers/') ? appPath(url) : url;
const mapListing = (book) => ({
  id: book._id,
  title: book.title,
  author: book.author || 'Unknown author',
  genre: book.genre || 'General',
  state: book.condition,
  location: book.location?.city,
  barterAvailable: book.barterAvailable,
  borrowAvailable: book.borrowAvailable,
  price: `₹${(book.priceCents / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
  cover: book.photos?.[0] ? listingPhoto(book.photos[0]) : appPath('/covers/placeholder.svg'),
  photos: (book.photos || []).map(listingPhoto),
  coverFallback: appPath('/covers/placeholder.svg'),
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
    'Every listing is provided by the reader who owns the book.',
  ],
  [
    'Are saved books kept?',
    'Your saved books stay tied to your account across devices once you log in.',
  ],
];

function Brand({ light = false }) {
  return (
    <a className="flex items-center gap-2.5" href="#top" aria-label="BetterReads home">
      <img className="size-10 rounded-full" src={appPath('/betterreads-reader.png')} alt="" />
      <span className="flex flex-col leading-none">
        <span className={cn('font-heading text-lg font-bold tracking-tight', light && 'text-brand-cream')}>BETTERREADS</span>
        <span className={cn('text-[10px] font-medium tracking-[0.12em]', light ? 'text-brand-cream/60' : 'text-muted-foreground')}>BOOKS · NEW BEGINNINGS</span>
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
  const books = liveBooks;
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
  const browseAll = () => window.location.assign(appPath('/books'));
  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    window.location.assign(appPath(query ? `/books?q=${encodeURIComponent(query)}` : '/books'));
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
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground" href="#main">
        Skip to content
      </a>
      <Navbar />

      <main id="main" className="font-sans text-foreground">
        <section className="relative h-[90vh] min-h-[560px] w-full overflow-hidden bg-brand-ink">
          <video
            ref={heroVideoRef}
            className="absolute inset-0 size-full object-cover"
            muted
            loop
            playsInline
            preload="metadata"
            poster={appPath('/hero-reader-3d.png')}
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src={appPath('/hero-reader.mp4')} type="video/mp4" />
          </video>
          <div className="absolute inset-0 flex items-end bg-[linear-gradient(0deg,#141e22e6,#141e2266_60%,#141e221a)] px-[6vw] pt-[6vw] pb-[8vw] text-brand-cream">
            <div className="max-w-[780px]">
              <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-brand-cream/80 uppercase"><span className="inline-block size-1.5 rounded-full bg-brand-wheat" /> Stories find their way</span>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="mt-4 text-[clamp(56px,9vw,104px)] leading-[0.9] font-extrabold tracking-tight uppercase">
                Good books.<br /><span className="text-brand-wheat">New beginnings.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-cream/90 max-sm:text-sm">
                Find a story that stays with you. Save a favourite or request an exchange with its reader. Every book deserves another chapter.
              </p>
              <div className="mt-7">
                <Button size="lg" className="h-12 bg-brand-wheat px-6 text-base font-semibold text-brand-olive hover:bg-brand-wheat/90" onClick={browseAll}>
                  Browse books <ArrowUpRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </div>
          <a className="absolute bottom-6 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center rounded-full border border-brand-cream/40 text-brand-cream transition-colors hover:bg-brand-cream/10" href="#shelf" aria-label="Scroll to books">
            <ArrowDown size={17} />
          </a>
        </section>

        <section className="mx-auto max-w-[1280px] px-6 py-16 max-sm:px-4 max-sm:py-12" id="shelf">
          <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            <span>From one reader to another</span>
            <span className="h-px flex-1 bg-border" />
            <span>01 / The shelves</span>
          </div>
          <div className="mt-6 flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
            <div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-[clamp(40px,6vw,68px)] leading-[0.95] font-extrabold tracking-tight uppercase">
                Pick your<br /><span className="text-brand-red">next chapter.</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">Find a story worth sharing.</p>
            </div>
            <Button variant="link" className="text-brand-red" onClick={browseAll}>
              Browse all listings <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <strong className="text-sm font-semibold">{normalizedSearch ? 'Search results' : showAll ? 'All books' : 'A few good finds'}</strong>
              <span className="text-xs text-muted-foreground">{shown.length} {shown.length === 1 ? 'book' : 'books'} · swipe or use arrows</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" aria-label="Previous books" disabled={!carousel.previous} onClick={() => scrollBooks(-1)}><ChevronLeft /></Button>
              <Button variant="outline" size="icon" aria-label="Next books" disabled={!carousel.next} onClick={() => scrollBooks(1)}><ChevronRight /></Button>
            </div>
          </div>
          <div className="mt-5 grid auto-cols-[minmax(240px,1fr)] grid-flow-col gap-5 overflow-x-auto pb-2 [scroll-snap-type:x_mandatory] [&>*]:[scroll-snap-align:start] max-md:auto-cols-[minmax(220px,80%)]" ref={track} onScroll={updateCarousel} aria-live="polite" aria-label="Book listings">
            {shown.length ? (
              shown.map((book, index) => <BookCard key={bookKey(book)} book={book} index={index} />)
            ) : (
              <p className="text-sm text-muted-foreground">No books match your search. <button className="font-medium text-brand-red hover:underline" onClick={browseAll}>Show all books</button></p>
            )}
          </div>
          {listingError && <p className="mt-3 text-sm text-muted-foreground" role="status">{listingError}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2 text-xs text-muted-foreground">
            <span>Saved books stay with your account.</span>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-6 max-sm:px-4" aria-label="A quote about reading">
          <img className="w-full rounded-xl" src={appPath('/reading-quote-second.png')} alt="A reader relaxes with a book in a cozy library while a cat naps nearby, beside a quote about reading by Mason Cooley." loading="lazy" />
        </section>

        <section className="mx-auto grid max-w-[1280px] grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] gap-10 px-6 py-16 max-md:grid-cols-1 max-sm:px-4 max-sm:py-12" id="faq">
          <div>
            <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">A few things you might be wondering</span>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="mt-2 text-[clamp(40px,6vw,64px)] leading-[0.95] font-extrabold tracking-tight uppercase">
              Good<br /><span className="text-brand-red">questions.</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">A little more about BetterReads.</p>
            <BookOpen size={27} className="mt-4 text-brand-red" />
          </div>
          <Accordion type="single" collapsible defaultValue="faq-0" className="w-full">
            {questions.map(([question, answer], index) => (
              <AccordionItem value={`faq-${index}`} key={question}>
                <AccordionTrigger className="text-base font-medium">{question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      <footer className="bg-brand-olive text-brand-cream">
        <div className="mx-auto grid max-w-[1390px] grid-cols-[1.4fr_0.8fr_0.8fr] gap-12 px-[5vw] py-12 max-md:grid-cols-1 max-md:gap-8">
          <div>
            <Brand light />
            <p className="mt-3 text-sm text-brand-cream/80">
              Good books deserve another chapter.<br />
              <button className="mt-2 inline-flex items-center gap-1.5 font-medium text-brand-cream hover:underline" onClick={browseAll}>Browse books <ArrowUpRight size={14} /></button>
            </p>
          </div>
          <nav className="flex flex-col gap-2 text-sm" aria-label="Browse BetterReads">
            <span className="text-xs font-semibold tracking-[0.14em] text-brand-cream/60 uppercase">Find your way</span>
            <a className="text-brand-cream/90 hover:text-brand-cream hover:underline" href={appPath('/books')}>All books</a>
            <a className="text-brand-cream/90 hover:text-brand-cream hover:underline" href="#faq">Questions</a>
          </nav>
          <div className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold tracking-[0.14em] text-brand-cream/60 uppercase">Your reading list</span>
            <a className="text-brand-cream/90 hover:text-brand-cream hover:underline" href={appPath('/wishlist')}>Saved books</a>
            <a className="inline-flex items-center gap-1.5 text-brand-cream/90 hover:text-brand-cream hover:underline" href="#top">Back to the top <ArrowUpRight size={14} /></a>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1390px] flex-wrap justify-between gap-2 border-t border-brand-cream/15 px-[5vw] py-5 text-xs text-brand-cream/70">
          <span>© {new Date().getFullYear()} BetterReads.</span>
          <span>Read well. Pass it on.</span>
        </div>
      </footer>
      <div className={cn('fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand-olive px-4 py-2.5 text-sm text-brand-cream shadow-lg transition-opacity', toast ? 'opacity-100' : 'pointer-events-none opacity-0')} role="status" aria-live="polite">
        <Check size={16} />
        {toast}
      </div>
    </div>
  );
}








