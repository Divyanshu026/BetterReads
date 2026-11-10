import { appPath } from '../services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import AccountPanel from './AccountPanel.jsx';
import WishlistButton from './WishlistButton.jsx';
import useReader from '../services/useReader.js';
import { api, localGet, photoUrl } from '../services/api.js';
import { exampleBooks } from '../exampleBooks.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';

export default function WishlistPopup() {
  const [open, setOpen] = useState(false);
  const { user, loading, refresh } = useReader();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [version, setVersion] = useState(0);
  const [exampleIds, setExampleIds] = useState([]);
  const triggerRef = useRef(null);

  const examples = exampleBooks.filter((book) => exampleIds.includes(book.title));
  const count = items.length + examples.length;

  useEffect(() => {
    setExampleIds(localGet('betterreads.wishlist', []));
  }, [version, open]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('openWishlist')) {
      setOpen(true);
      params.delete('openWishlist');
      const query = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
    }
    const show = () => setOpen(true);
    window.addEventListener('betterreads:open-wishlist', show);
    return () => window.removeEventListener('betterreads:open-wishlist', show);
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) { setItems([]); return () => { active = false; }; }
    setFetching(true);
    api('/api/wishlist')
      .then((data) => { if (active) { setItems(data.wishlist || []); setError(''); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setFetching(false); });
    return () => { active = false; };
  }, [user, version, open]);

  useEffect(() => {
    const update = () => setVersion((n) => n + 1);
    window.addEventListener('betterreads:local-change', update);
    return () => window.removeEventListener('betterreads:local-change', update);
  }, []);

  const bump = () => setVersion((n) => n + 1);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={`Wishlist${count ? `, ${count} saved` : ''}`}
          title="Wishlist"
        >
          <Heart aria-hidden="true" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="flex w-[min(400px,calc(100vw-24px))] max-w-[400px] flex-col gap-0 p-0"
      >
        <PopoverHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <PopoverTitle className="font-heading text-base font-semibold">Saved for later</PopoverTitle>
            <PopoverDescription className="text-xs">
              {count > 0 ? `${count} book${count === 1 ? '' : 's'} on your wishlist` : 'Keep books you love in one place'}
            </PopoverDescription>
          </div>
          {count > 0 && (
            <Badge variant="secondary" className="shrink-0 tabular-nums">{count}</Badge>
          )}
        </PopoverHeader>
        <Separator />
        <div className="flex max-h-[460px] min-h-0 flex-col gap-0 overflow-y-auto">
          {loading || fetching ? (
            <ul className="flex flex-col gap-1 p-2" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <li className="flex items-center gap-3 p-2" key={i}>
                  <Skeleton className="h-16 w-12 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                </li>
              ))}
            </ul>
          ) : !user ? (
            <div className="flex flex-col gap-3 p-4">
              <p className="text-sm text-muted-foreground">Log in to keep a wishlist of reader listings across your devices.</p>
              <AccountPanel onAuthenticated={refresh} />
            </div>
          ) : error ? (
            <Empty className="gap-3 p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Heart aria-hidden="true" /></EmptyMedia>
                <EmptyTitle>Couldn't load your wishlist</EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type="button" size="sm" variant="outline" onClick={bump}>Try again</Button>
              </EmptyContent>
            </Empty>
          ) : !count ? (
            <Empty className="gap-3 p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Heart aria-hidden="true" /></EmptyMedia>
                <EmptyTitle>Nothing saved yet</EmptyTitle>
                <EmptyDescription>Tap the heart on any book to keep it here for later.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild size="sm"><a href={appPath('/books')}>Browse books</a></Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-0.5 p-2">
              {items.map((book) => (
                <li
                  className="group/row flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted"
                  key={book._id}
                >
                  <a className="shrink-0" href={appPath(`/books/${book._id}`)}>
                    <img
                      className="h-16 w-12 rounded-sm object-cover"
                      src={book.photos?.[0] ? photoUrl(book.photos[0]) : appPath('/covers/placeholder.svg')}
                      alt=""
                    />
                  </a>
                  <a
                    className="flex min-w-0 flex-1 flex-col gap-0.5 outline-none"
                    href={appPath(`/books/${book._id}`)}
                  >
                    <strong className="truncate text-sm font-medium text-foreground group-hover/row:underline">{book.title}</strong>
                    <span className="truncate text-xs text-muted-foreground">
                      {book.author || 'Unknown author'}{book.location?.city ? ` · ${book.location.city}` : ''}
                    </span>
                  </a>
                  <WishlistButton
                    bookId={book._id}
                    iconOnly
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-destructive aria-pressed:text-destructive"
                    onSignIn={refresh}
                    onChange={bump}
                  />
                </li>
              ))}
              {examples.length > 0 && items.length > 0 && (
                <li aria-hidden="true" className="px-2 pt-3 pb-1">
                  <span className="text-xs font-medium text-muted-foreground">Example books</span>
                </li>
              )}
              {examples.map((book) => (
                <li
                  className="group/row flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted"
                  key={book.title}
                >
                  <a className="shrink-0" href={appPath(`/books/example/${encodeURIComponent(book.title)}`)}>
                    <img className="h-16 w-12 rounded-sm object-cover" src={book.cover} alt="" />
                  </a>
                  <a
                    className="flex min-w-0 flex-1 flex-col gap-0.5 outline-none"
                    href={appPath(`/books/example/${encodeURIComponent(book.title)}`)}
                  >
                    <strong className="truncate text-sm font-medium text-foreground group-hover/row:underline">{book.title}</strong>
                    <span className="truncate text-xs text-muted-foreground">Example book · saved in this browser</span>
                  </a>
                  <WishlistButton
                    bookId={book.title}
                    example
                    iconOnly
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-destructive aria-pressed:text-destructive"
                    onChange={bump}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        {user && count > 0 && !loading && !fetching && !error && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-2 px-4 py-2.5">
              <span className="text-xs text-muted-foreground">Keep exploring to add more</span>
              <Button asChild size="sm" variant="ghost">
                <a href={appPath('/books')}>Browse books</a>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
