import { Link } from 'react-router-dom'

const BookCard = ({ book }) => {
  const {
    id = book?._id || 1,
    title = "The Great Gatsby",
    author = "F. Scott Fitzgerald",
    photos = [],
    cover = undefined,
    condition = "Good",
    location = "Brooklyn, NY",
    owner = {
      name: "Sarah M.",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
    },
    tradeType = "Trade or Free"
  } = book || {}

  // Use uploaded image if available, else fallback to standard no-image
  const noImage = "https://via.placeholder.com/300x400?text=No+Image";
  const displayCover = (photos && photos.length > 0 && photos[0]) || cover || noImage;

  const conditionColors = {
    'Like New': 'bg-emerald-500/20 text-emerald-400',
    'Good': 'bg-blue-500/20 text-blue-400',
    'Fair': 'bg-amber-500/20 text-amber-400',
    'Worn': 'bg-stone-500/20 text-stone-400'
  }

  return (
    <Link to={`/book/${id}`} className="group block max-w-[200px] w-full mx-auto">
      <div
        className="bg-white overflow-hidden border border-stone-300 shadow-md hover:shadow-amber-500/20 transition-all duration-300 hover:-translate-y-1 relative"
      >
        {/* Book Cover Only */}
        <div className="relative aspect-3/4 overflow-hidden max-h-80">
          <img
            src={displayCover}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ maxHeight: '20rem' }}
          />
        </div>
      </div>
      {/* Book name and author centered below cover */}
      <div className="flex flex-col items-center px-5 py-3 bg-white rounded-b-xl border-t border-stone-200">
        <span className="text-black font-semibold text-lg text-center whitespace-normal break-words w-full mb-1" style={{fontFamily: 'inherit'}}>{title}</span>
        <span className="text-stone-500 text-base text-center whitespace-normal break-words w-full" style={{fontFamily: 'inherit'}}>{author}</span>
      </div>
    </Link>
  )
}

export default BookCard
