export default function BookCardSkeleton({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div className="book-card-skeleton" key={index} aria-hidden="true">
          <div className="skeleton-art" />
          <div className="skeleton-body">
            <div className="skeleton-line pill" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        </div>
      ))}
    </>
  );
}
