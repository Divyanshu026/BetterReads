export default function BookCard({ book, index }) {
  const href = book.id ? `/books/${encodeURIComponent(book.id)}` : `/books/example/${encodeURIComponent(book.title)}`;
  return (
    <article className="book-card card-16-book-card minimal-book-card">
      <a className={`card-16-book-art stage-${index % 4} minimal-book-link`} href={href} aria-label={`View details for ${book.title}`}>
        <img className="card-16-cover" src={book.cover} alt={`${book.title} cover`} loading="lazy" onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = book.coverFallback;
        }} />
        <span className="card-16-condition">{book.state}</span>
      </a>
      <div className="minimal-book-details">
        <h3>{book.title}</h3>
        <p>{book.note}</p>
        <a href={href} aria-label={`View details for ${book.title}`}>View details <span aria-hidden="true">↗</span></a>
      </div>
    </article>
  );
}


