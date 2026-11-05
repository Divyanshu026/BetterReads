import { appPath } from '../services/paths.js';
import { ArrowUpRight, MapPin } from 'lucide-react';
import WishlistButton from './WishlistButton.jsx';

export default function BookCard({ book, index = 0, onWishlistChange }) {
  const href = book.id ? appPath(`/books/${encodeURIComponent(book.id)}`) : appPath(`/books/example/${encodeURIComponent(book.title)}`);
  return <article className="book-card card-16-book-card minimal-book-card">
    <a className={`card-16-book-art stage-${index % 4} minimal-book-link`} href={href} aria-label={`View details for ${book.title}`}>
      <img className="card-16-cover" src={book.cover || appPath('/covers/placeholder.svg')} alt={`${book.title} cover`} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = book.coverFallback || appPath('/covers/placeholder.svg'); }} />
    </a>
    <div className="minimal-book-details">
      <div className="book-card-topline"><span className="book-condition-pill">{book.state || 'Condition not specified'}</span><WishlistButton bookId={book.id || book.title} example={!book.id} onChange={onWishlistChange} onSignIn={() => window.location.assign(appPath('/readers/me'))} className="card-wishlist-button" /></div>
      <h3><a href={href}>{book.title}</a></h3>
      <p className="book-card-author">{book.author || 'Unknown author'}{book.genre ? ` · ${book.genre}` : ''}</p>
      <small className="book-card-location"><MapPin size={14} aria-hidden="true" /> {book.location || 'Location not provided'}</small>
      <div className="book-availability">{book.barterAvailable && <span>Exchange</span>}{book.borrowAvailable && <span>Borrow</span>}</div>
      <a className="book-detail-link" href={href} aria-label={`View details for ${book.title}`}>View Book Details <ArrowUpRight size={16} aria-hidden="true" /></a>
    </div>
  </article>;
}
