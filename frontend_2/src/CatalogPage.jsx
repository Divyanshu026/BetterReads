import { appPath } from './services/paths.js';
import { useEffect, useState } from 'react';
import { Check, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import BookCard from './components/BookCard.jsx';
import BookCardSkeleton from './components/BookCardSkeleton.jsx';
import Navbar from './components/Navbar.jsx';
import { getAllBooks, localGet, localSet, photoUrl } from './services/api.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from '@/components/ui/input-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';

const emptyFilters = { type: '', genre: '', authors: [], condition: '', availability: '', city: '' };
const types = ['Fiction', 'Non-fiction', 'Academic', 'Comics/Manga', 'Biography', 'Self-help', 'Other'];
const genres = ['Fantasy', 'Mystery', 'Romance', 'Thriller', 'Science Fiction', 'History', 'Philosophy', 'Technology', 'Other'];
const text = (value) => String(value || '').toLocaleLowerCase();

function FilterChips({ label, options, value, onChange }) {
  const items = options.map((o) => typeof o === 'string' ? { value: o, label: o } : o);
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {value && <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange('')}>Reset</button>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => { const on = value === item.value; return <button key={item.value} type="button" onClick={() => onChange(on ? '' : item.value)} className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted')}>{on && <Check className="size-3" />} {item.label}</button>; })}
      </div>
    </div>
  );
}

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
  useEffect(() => { if (sessionStorage.getItem('betterreads.listingCreated') === '1') { const title = sessionStorage.getItem('betterreads.listingTitle') || 'Your book'; sessionStorage.removeItem('betterreads.listingCreated'); sessionStorage.removeItem('betterreads.listingTitle'); toast.success(`"${title}" has been listed`); } }, []);
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
  return <div className="min-h-screen bg-background text-foreground font-sans"><Navbar /><main className="mx-auto max-w-[1280px] px-6 py-8 max-sm:px-4 max-sm:py-6">
    <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      <span>From one reader to another</span>
      <span className="h-px flex-1 bg-border" />
      <span>Browse books</span>
    </div>
    <div className="mt-6 mb-6 flex items-end justify-between gap-6 max-md:flex-col max-md:items-start">
      <div>
        <h1
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          className="text-[clamp(40px,6vw,68px)] leading-[0.95] font-extrabold tracking-tight uppercase"
        >
          Find your<br />
          <span className="text-brand-red">next chapter.</span>
        </h1>
        <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-muted-foreground max-sm:text-sm">
          Explore books listed by readers.
        </p>
      </div>
      <Button asChild><a href={appPath('/list-book')}>List a book</a></Button>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <InputGroup className="h-10 min-w-[260px] flex-1 rounded-full px-1 shadow-sm">
        <InputGroupAddon className="pl-3 text-muted-foreground"><Search aria-hidden="true" /></InputGroupAddon>
        <InputGroupInput
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search books, authors, genres..."
          aria-label="Search listings"
        />
        {search && (
          <InputGroupAddon align="inline-end" className="pr-1">
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              className="rounded-full"
              aria-label="Clear search"
              onClick={() => setSearch('')}
            >
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      <Sheet open={filterOpen} onOpenChange={(open) => { if (open) setDraft(filters); setFilterOpen(open); }}>
        <SheetTrigger asChild><Button type="button" variant="outline"><SlidersHorizontal data-icon="inline-start" /> Filters {active.length > 0 && <Badge variant="secondary" className="ml-1">{active.length}</Badge>}</Button></SheetTrigger>
        <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="font-heading text-lg">Filters</SheetTitle>
            <SheetDescription>Refine the listings by type, availability, and more.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <FilterChips label="Book type" options={types} value={draft.type} onChange={(v) => setDraft({ ...draft, type: v })} />
            <FilterChips label="Genre" options={genres} value={draft.genre} onChange={(v) => setDraft({ ...draft, genre: v })} />
            <FilterChips label="Condition" options={['New', 'Like New', 'Good', 'Fair', 'Used']} value={draft.condition} onChange={(v) => setDraft({ ...draft, condition: v })} />
            <FilterChips label="Availability" options={[{ value: 'exchange', label: 'Exchange' }, { value: 'borrow', label: 'Borrowing' }, { value: 'meetup', label: 'Meetup' }]} value={draft.availability} onChange={(v) => setDraft({ ...draft, availability: v })} />
            <div className="mt-5">
              <Field>
                <FieldLabel htmlFor="filter-city">City or area</FieldLabel>
                <div className="flex gap-2">
                  <Input id="filter-city" list="book-cities" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="All locations" />
                  <Button type="button" variant="outline" size="icon" aria-label="Use my location" onClick={detectLocation}><MapPin /></Button>
                </div>
                <datalist id="book-cities">{cities.map((city) => <option key={city} value={city} />)}</datalist>
                {locationMessage && <FieldDescription role="status">{locationMessage}</FieldDescription>}
              </Field>
            </div>
            <div className="mt-5">
              <Field>
                <FieldLabel htmlFor="filter-authors">Authors</FieldLabel>
                <Input id="filter-authors" value={authorSearch} onChange={(e) => setAuthorSearch(e.target.value)} placeholder="Find an author" />
              </Field>
              <div className="mt-3 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                {authors.filter((name) => text(name).includes(text(authorSearch))).map((name) => { const on = draft.authors.includes(name); return <button key={name} type="button" onClick={() => setDraft({ ...draft, authors: on ? draft.authors.filter((a) => a !== name) : [...draft.authors, name] })} className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted')}>{on && <Check className="size-3" />} {name}</button>; })}
                {!authors.length && <FieldDescription>No authors yet.</FieldDescription>}
              </div>
            </div>
            <FieldDescription className="mt-5">Type, borrowing and meetup filters only match listings that provide those details.</FieldDescription>
          </div>
          <SheetFooter className="flex-row border-t border-border px-5 py-4">
            <Button type="button" variant="outline" className="flex-1" onClick={clear}>Clear all</Button>
            <Button type="button" className="flex-1" onClick={apply}>Apply filters</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <div className="relative">
        <Button type="button" variant="outline" aria-expanded={locationOpen} aria-controls="catalog-location" onClick={() => setLocationOpen(!locationOpen)}><MapPin data-icon="inline-start" /> {filters.city || 'All locations'}</Button>
        {locationOpen && <Card id="catalog-location" className="absolute top-full right-0 z-30 mt-2 w-72"><CardContent className="flex flex-col gap-3">
          <Field><FieldLabel htmlFor="catalog-city">City or area</FieldLabel><Input id="catalog-city" list="location-cities" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Search for a city" /></Field>
          <datalist id="location-cities">{cities.map((city) => <option key={city} value={city} />)}</datalist>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={detectLocation}>Use my location</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { const next = { ...filters, city: '' }; setFilters(next); setDraft(next); localSet('betterreads.city', ''); setLocationOpen(false); }}>All locations</Button>
          </div>
          <Button type="button" size="sm" onClick={() => { const next = { ...filters, city: draft.city.trim() }; setFilters(next); setDraft(next); localSet('betterreads.city', next.city); setLocationOpen(false); }}>Apply location</Button>
          {locationMessage && <FieldDescription role="status">{locationMessage}</FieldDescription>}
        </CardContent></Card>}
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">Sort <Select value={sort} onValueChange={setSort}><SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="newest">Newest</SelectItem><SelectItem value="title">Title</SelectItem><SelectItem value="relevance">Relevance</SelectItem></SelectGroup></SelectContent></Select></label>
      <span aria-live="polite" className="text-sm text-muted-foreground">{loading ? 'Loading…' : `${matches.length} ${matches.length === 1 ? 'book' : 'books'}`}</span>
    </div>
    {active.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">{active.map((value, index) => <Badge key={`${value}-${index}`} variant="secondary">{value}</Badge>)}<Button type="button" variant="ghost" size="sm" onClick={clear}><X data-icon="inline-start" /> Clear all</Button></div>}
    <Separator className="my-5" />
    {loading ? <><p role="status" className="sr-only">Loading available books…</p><div className="catalog-grid" aria-hidden="true"><BookCardSkeleton count={8} /></div></> : error ? <div role="alert" className="flex flex-col items-start gap-2 py-6"><p className="text-sm text-muted-foreground">{error}</p><Button type="button" variant="outline" size="sm" onClick={() => setReload((n) => n + 1)}>Try again</Button></div> : matches.length ? <div className="catalog-grid">{matches.map((book, index) => <BookCard key={book._id} index={index} book={{ id: book._id, title: book.title, author: book.author, genre: book.genre, barterAvailable: book.barterAvailable, borrowAvailable: book.borrowAvailable, state: book.condition, location: book.location?.city, note: book.description || `By ${book.author || 'a reader'}`, cover: book.photos?.[0] ? photoUrl(book.photos[0]) : appPath('/covers/placeholder.svg'), coverFallback: appPath('/covers/placeholder.svg') }} />)}</div> : <div className="flex flex-col items-start gap-2 py-10"><p className="text-sm text-muted-foreground">{query || active.length ? 'No books match these filters.' : 'No books have been listed yet.'}</p><Button type="button" variant="outline" size="sm" onClick={() => { setSearch(''); clear(); }}>Show all books</Button></div>}
  </main></div>;
}

