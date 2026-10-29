import { Heart, Plus, Repeat2 } from 'lucide-react';

export default function BookCard({ book, saved, inBag, index, onSave, onAdd }) {
  return (
    <article className="book-card card-16-book-card">
      <div className={`card-16-book-art stage-${index % 4}`}>
        <span className="card-16-condition">{book.state} · sample</span>
        <button
          className={`card-16-save ${saved ? 'saved' : ''}`}
          type="button"
          aria-label={`${saved ? 'Remove' : 'Save'} ${book.title} ${saved ? 'from' : 'to'} saved books`}
          aria-pressed={saved}
          onClick={onSave}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        <img
          className="card-16-cover"
          src={book.cover}
          alt={book.title + ' book cover'}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = book.coverFallback;
          }}
        />
        <span className="card-16-sample-tag">
          <Repeat2 size={12} aria-hidden="true" /> Sample reader listing
        </span>
      </div>
      <div className="card-16-book-details">
        <div className="card-16-book-kicker">
          <span>{book.genre}</span>
          <span>Sample listing</span>
        </div>
        <div className="card-16-book-heading">
          <div>
            <h3>{book.title}</h3>
            <p>by {book.author}</p>
          </div>
          <strong>{book.price}</strong>
        </div>
        <p className="card-16-book-note">{book.note}</p>
        <button className="button button-red card-16-add" type="button" onClick={onAdd}>
          {inBag ? 'ADD ANOTHER' : 'ADD TO LOCAL BAG'} <Plus size={15} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}