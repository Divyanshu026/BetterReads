const BookMarker = ({ className = '', size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-10',
    md: 'w-12 h-14',
    lg: 'w-16 h-20',
  }

  return (
    <div className={`${sizes[size]} ${className}`}>
      <svg viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
        {/* Map pin shape */}
        <path
          d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z"
          fill="rgba(107, 114, 128, 0.7)"
        />
        {/* Book icon inside */}
        <g transform="translate(10, 8)">
          <rect x="2" y="2" width="16" height="14" rx="1" stroke="white" strokeWidth="1.5" fill="none" />
          <line x1="10" y1="2" x2="10" y2="16" stroke="white" strokeWidth="1.5" />
          <path d="M4 5h4M4 8h4M4 11h4" stroke="white" strokeWidth="1" strokeLinecap="round" />
          <path d="M12 5h4M12 8h4M12 11h4" stroke="white" strokeWidth="1" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  )
}

export default BookMarker
