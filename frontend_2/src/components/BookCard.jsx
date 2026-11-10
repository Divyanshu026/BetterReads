import { appPath } from '../services/paths.js';
import { ArrowUpRight, MapPin } from 'lucide-react';
import WishlistButton from './WishlistButton.jsx';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BookCard({ book, index = 0, onWishlistChange }) {
  const href = book.id ? appPath(`/books/${encodeURIComponent(book.id)}`) : appPath(`/books/example/${encodeURIComponent(book.title)}`);
  return <Card className="group/book-card gap-0 pt-0 transition-shadow hover:ring-foreground/20 hover:shadow-md">
    <a className={`card-16-book-art stage-${index % 4} minimal-book-link`} href={href} tabIndex={-1} aria-hidden="true">
      <img className="card-16-cover" src={book.cover || appPath('/covers/placeholder.svg')} alt={`${book.title} cover`} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = book.coverFallback || appPath('/covers/placeholder.svg'); }} />
    </a>
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary">{book.state || 'Condition unspecified'}</Badge>
        <WishlistButton
          bookId={book.id || book.title}
          example={!book.id}
          iconOnly
          onChange={onWishlistChange}
          onSignIn={() => window.location.assign(appPath('/readers/me'))}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:text-destructive disabled:opacity-50"
        />
      </div>
      <h3 className="font-heading text-base leading-snug font-medium">
        <a className="inline-flex items-center gap-1 hover:underline" href={href}>{book.title} <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" /></a>
      </h3>
      <p className="text-sm text-muted-foreground">{book.author || 'Unknown author'}{book.genre ? ` · ${book.genre}` : ''}</p>
      <small className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" /> {book.location || 'Location not provided'}</small>
      {(book.barterAvailable || book.borrowAvailable) && <div className="mt-1 flex flex-wrap gap-1.5">{book.barterAvailable && <Badge variant="outline">Exchange</Badge>}{book.borrowAvailable && <Badge variant="outline">Borrow</Badge>}</div>}
    </div>
  </Card>;
}
