import { appPath } from './services/paths.js';
import { useEffect, useState } from 'react';
import { MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import BookCard from './components/BookCard.jsx';
import BookCardSkeleton from './components/BookCardSkeleton.jsx';
import Navbar from './components/Navbar.jsx';
import { getAllBooks, localGet, localSet, photoUrl } from './services/api.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';

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
  return <div className="min-h-screen bg-background text-foreground font-sans"><Navbar /><main className="mx-auto max-w-[1280px] px-6 py-8 max-sm:px-4 max-sm:py-6">
    <div className="mb-6 flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
      <div><span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">From one reader to another</span><h1 className="font-heading text-4xl font-bold tracking-tight max-sm:text-3xl">Find your next chapter.</h1><p className="mt-1 text-sm text-muted-foreground">Explore books listed by readers.</p></div>
      <Button asChild><a href={appPath('/list-book')}>List a book</a></Button>
    </div>
    {notice && <div className="mb-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm" role="status">Your book has been listed.</div>}
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative flex min-w-[240px] flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Search listings</span>
        <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search books, authors, genres..." className="pl-9" />
      </label>
      <Button type="button" variant="outline" aria-expanded={filterOpen} aria-controls="book-filters" onClick={() => { setDraft(filters); setFilterOpen(!filterOpen); }}><SlidersHorizontal data-icon="inline-start" /> Filters {active.length > 0 && `(${active.length})`}</Button>
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
    {filterOpen && <Card id="book-filters" className="mt-4" aria-label="Book filters"><CardContent className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-2 max-sm:grid-cols-1">
        <Field><FieldLabel htmlFor="filter-type">Book type</FieldLabel><Select value={draft.type || 'all'} onValueChange={(v) => setDraft({ ...draft, type: v === 'all' ? '' : v })}><SelectTrigger id="filter-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All types</SelectItem>{types.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
        <Field><FieldLabel htmlFor="filter-genre">Genre</FieldLabel><Select value={draft.genre || 'all'} onValueChange={(v) => setDraft({ ...draft, genre: v === 'all' ? '' : v })}><SelectTrigger id="filter-genre" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All genres</SelectItem>{genres.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
        <Field><FieldLabel htmlFor="filter-condition">Condition</FieldLabel><Select value={draft.condition || 'all'} onValueChange={(v) => setDraft({ ...draft, condition: v === 'all' ? '' : v })}><SelectTrigger id="filter-condition" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All conditions</SelectItem>{['New', 'Like New', 'Good', 'Fair', 'Used'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
        <Field><FieldLabel htmlFor="filter-avail">Availability</FieldLabel><Select value={draft.availability || 'all'} onValueChange={(v) => setDraft({ ...draft, availability: v === 'all' ? '' : v })}><SelectTrigger id="filter-avail" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All books</SelectItem><SelectItem value="exchange">Exchange</SelectItem><SelectItem value="borrow">Borrowing</SelectItem><SelectItem value="meetup">Meetup/handover</SelectItem></SelectGroup></SelectContent></Select></Field>
        <Field><FieldLabel htmlFor="filter-city">City or area</FieldLabel><Input id="filter-city" list="book-cities" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="All locations" /><datalist id="book-cities">{cities.map((city) => <option key={city} value={city} />)}</datalist></Field>
        <div className="flex flex-col gap-1.5"><Button type="button" variant="ghost" size="sm" className="self-start" onClick={detectLocation}><MapPin data-icon="inline-start" /> Use my location</Button><FieldDescription>City lookup is not configured; choose a city manually.</FieldDescription>{locationMessage && <FieldDescription role="status">{locationMessage}</FieldDescription>}</div>
      </div>
      <Field><FieldLabel htmlFor="filter-authors">Authors</FieldLabel><Input id="filter-authors" aria-label="Find an author" value={authorSearch} onChange={(e) => setAuthorSearch(e.target.value)} placeholder="Find an author" /><div className="mt-2 flex max-h-40 flex-wrap gap-x-4 gap-y-2 overflow-y-auto">{authors.filter((name) => text(name).includes(text(authorSearch))).map((name) => <label key={name} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.authors.includes(name)} onChange={() => setDraft({ ...draft, authors: draft.authors.includes(name) ? draft.authors.filter((a) => a !== name) : [...draft.authors, name] })} className="size-4 accent-primary" /> {name}</label>)}</div></Field>
      <FieldDescription>Type, borrowing and meetup filters only match listings that provide those details.</FieldDescription>
      <div className="flex gap-2"><Button type="button" onClick={apply}>Apply filters</Button><Button type="button" variant="outline" onClick={clear}>Clear all</Button></div>
    </CardContent></Card>}
    {active.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">{active.map((value, index) => <Badge key={`${value}-${index}`} variant="secondary">{value}</Badge>)}<Button type="button" variant="ghost" size="sm" onClick={clear}><X data-icon="inline-start" /> Clear all</Button></div>}
    <Separator className="my-5" />
    {loading ? <><p role="status" className="sr-only">Loading available books…</p><div className="catalog-grid" aria-hidden="true"><BookCardSkeleton count={8} /></div></> : error ? <div role="alert" className="flex flex-col items-start gap-2 py-6"><p className="text-sm text-muted-foreground">{error}</p><Button type="button" variant="outline" size="sm" onClick={() => setReload((n) => n + 1)}>Try again</Button></div> : matches.length ? <div className="catalog-grid">{matches.map((book, index) => <BookCard key={book._id} index={index} book={{ id: book._id, title: book.title, author: book.author, genre: book.genre, barterAvailable: book.barterAvailable, borrowAvailable: book.borrowAvailable, state: book.condition, location: book.location?.city, note: book.description || `By ${book.author || 'a reader'}`, cover: book.photos?.[0] ? photoUrl(book.photos[0]) : appPath('/covers/placeholder.svg'), coverFallback: appPath('/covers/placeholder.svg') }} />)}</div> : <div className="flex flex-col items-start gap-2 py-10"><p className="text-sm text-muted-foreground">{query || active.length ? 'No books match these filters.' : 'No books have been listed yet.'}</p><Button type="button" variant="outline" size="sm" onClick={() => { setSearch(''); clear(); }}>Show all books</Button></div>}
  </main></div>;
}

