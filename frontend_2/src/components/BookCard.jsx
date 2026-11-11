import { appPath } from '../services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import WishlistButton from './WishlistButton.jsx';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BookCard({ book, onWishlistChange }) {
  const fallback = book.coverFallback || appPath('/covers/placeholder.svg');
  const sources = (book.photos && book.photos.length ? book.photos : [book.cover]).filter(Boolean);
  const images = sources.length ? sources : [fallback];
  const href = appPath(`/books/${encodeURIComponent(book.id)}`);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!hovered || images.length < 2) return undefined;
    timerRef.current = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, 1200);
    return () => window.clearInterval(timerRef.current);
  }, [hovered, images.length]);

  useEffect(() => () => window.clearInterval(timerRef.current), []);

  function onEnter() { setHovered(true); }
  function onLeave() { setHovered(false); setIndex(0); }

  return (
    <Card
      className="group/book-card gap-0 pt-0 transition-shadow hover:ring-foreground/20 hover:shadow-lg"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <a
        className="relative block aspect-[5/4] overflow-hidden bg-muted"
        href={href}
        aria-label={`${book.title} by ${book.author || 'Unknown author'}`}
      >
        {images.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            loading="lazy"
            className={cn(
              'absolute inset-0 size-full object-cover transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
              i === index ? 'opacity-100' : 'opacity-0',
            )}
            onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallback; }}
          />
        ))}
        {images.length > 1 && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity duration-200 group-hover/book-card:opacity-100">
            {images.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cn(
                  'size-1.5 rounded-full transition-colors',
                  i === index ? 'bg-foreground' : 'bg-foreground/30',
                )}
              />
            ))}
          </div>
        )}
      </a>
      <div className="flex flex-col gap-1.5 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{book.state || 'Condition unspecified'}</Badge>
          <WishlistButton
            bookId={book.id}
            iconOnly
            onChange={onWishlistChange}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:text-destructive disabled:opacity-50"
          />
        </div>
        <h3 className="font-heading text-base leading-snug font-medium">
          <a className="inline-flex items-center gap-1 hover:underline" href={href}>
            {book.title} <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
          </a>
        </h3>
        <p className="text-sm text-muted-foreground">
          {book.author || 'Unknown author'}{book.genre ? ` · ${book.genre}` : ''}
        </p>
        <small className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" /> {book.location || 'Location not provided'}
        </small>
        {(book.barterAvailable || book.borrowAvailable) && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {book.barterAvailable && <Badge variant="outline">Exchange</Badge>}
            {book.borrowAvailable && <Badge variant="outline">Borrow</Badge>}
          </div>
        )}
      </div>
    </Card>
  );
}
