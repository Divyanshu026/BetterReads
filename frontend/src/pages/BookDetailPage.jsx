import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'
import BookCard from '../components/BookCard'
import { booksAPI, wishlistAPI, chatsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const BookDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { addToCart, isInCart } = useCart()
  const [book, setBook] = useState(null)
  const [relatedBooks, setRelatedBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [inWishlist, setInWishlist] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [addedToCart, setAddedToCart] = useState(false)
  const [tradeRequested, setTradeRequested] = useState(false)

  // Fetch book details
  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true)
        const response = await booksAPI.get(id)
        setBook(response.data)

        // Check if in wishlist
        if (isAuthenticated) {
          try {
            const wishlistCheck = await wishlistAPI.check(id)
            setInWishlist(wishlistCheck.data.inWishlist)
          } catch (e) {
            console.error('Wishlist check error:', e)
          }
        }

        // Fetch related books (same genre)
        if (response.data.genre) {
          const relatedResponse = await booksAPI.list({ genre: response.data.genre, limit: 4 })
          setRelatedBooks(relatedResponse.data.filter(b => b._id !== id))
        }
      } catch (error) {
        console.error('Error fetching book:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBook()
  }, [id, isAuthenticated])

  // Toggle wishlist
  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    try {
      if (inWishlist) {
        await wishlistAPI.remove(id)
        setInWishlist(false)
      } else {
        await wishlistAPI.add(id)
        setInWishlist(true)
      }
    } catch (error) {
      console.error('Wishlist error:', error)
    }
  }

  // Handle trade request - opens chat with seller
  const handleTradeRequest = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (tradeRequested) {
      // If already requested, navigate to chats
      navigate('/chats')
      return
    }

    setSubmitting(true)
    try {
      const ownerId = book.sellerId?._id || book.ownerId?._id
      const chatResponse = await chatsAPI.create(ownerId)
      
      // Send initial trade request message
      await chatsAPI.sendMessage(
        chatResponse.data._id, 
        `Hi! I'm interested in trading for "${book.title}". Would you be open to a trade?`
      )

      // Mark as requested instead of navigating
      setTradeRequested(true)
    } catch (error) {
      console.error('Trade request error:', error)
      alert(error.response?.data?.error?.message || 'Failed to send trade request')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle add to cart
  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    addToCart(book)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  // Handle message button
  const handleMessage = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    try {
      const ownerId = book.sellerId?._id || book.ownerId?._id
      const chatResponse = await chatsAPI.create(ownerId)
      navigate(`/chat/${chatResponse.data._id}`)
    } catch (error) {
      console.error('Chat error:', error)
    }
  }

  // Social sharing
  const shareBook = () => {
    if (navigator.share) {
      navigator.share({
        title: book.title,
        text: `Check out this book: ${book.title} by ${book.author}`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="pt-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-80 h-96 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-10 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="pt-24 px-8 text-center">
          <h1 className="text-2xl text-[#1e3a5f]">Book not found</h1>
          <Link to="/browse" className="text-[#f7941d] hover:text-[#e8850f] mt-4 inline-block">
            Back to Browse
          </Link>
        </div>
      </div>
    )
  }

  const owner = book.sellerId || book.ownerId || {}
  const isOwner = user && (owner._id === user.id || String(book.ownerId) === user.id)
  const images = book.photos && book.photos.length > 0 ? book.photos : ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop']

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />

      <div className="pt-20 px-4 pb-8 flex-1">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4 py-2">
            <Link to="/" className="hover:text-[#f7941d] transition-colors">Home</Link>
            <span>/</span>
            <Link to="/browse" className="hover:text-[#f7941d] transition-colors">Books</Link>
            <span>/</span>
            {book.genre && (
              <>
                <Link to={`/results?category=genre&value=${book.genre}`} className="hover:text-[#f7941d] transition-colors">{book.genre}</Link>
                <span>/</span>
              </>
            )}
            <span className="text-gray-700 truncate max-w-[200px]">{book.title}</span>
          </nav>

          {/* Main Content Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-col lg:flex-row">
              
              {/* Left Column - Image */}
              <div className="lg:w-96 p-6 border-b lg:border-b-0 lg:border-r border-gray-200">
                <div className="sticky top-24">
                  {/* Main Image */}
                  <div className="relative bg-gray-50 rounded-lg overflow-hidden mb-4">
                    <img
                      src={images[currentImageIndex]}
                      alt={book.title}
                      className="w-full h-80 object-contain"
                    />
                    
                    {/* Condition Badge */}
                    <span className="absolute top-3 left-3 px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
                      {book.condition}
                    </span>

                    {/* Wishlist Button */}
                    <button
                      onClick={handleWishlistToggle}
                      className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-md hover:shadow-lg transition-all"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill={inWishlist ? "#f7941d" : "none"}
                        stroke={inWishlist ? "#f7941d" : "currentColor"}
                        strokeWidth={inWishlist ? 0 : 2}
                        className="w-5 h-5 text-gray-600"
                      >
                        <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                      </svg>
                    </button>
                  </div>

                  {/* Thumbnail Strip */}
                  {images.length > 1 && (
                    <div className="flex gap-2 justify-center">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-14 h-18 rounded-md overflow-hidden border-2 transition-colors ${
                            idx === currentImageIndex ? 'border-[#f7941d]' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons - Desktop */}
                  {!isOwner && (
                    <div className="hidden lg:flex flex-col gap-3 mt-6">
                      {book.priceCents > 0 && (
                        <button
                          onClick={handleAddToCart}
                          disabled={isInCart(book._id) || addedToCart}
                          className={`w-full py-3 font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                            isInCart(book._id) || addedToCart
                              ? 'bg-green-500 text-white'
                              : 'bg-[#ff9f00] hover:bg-[#e89100] text-white'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM3.75 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM16.5 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
                          </svg>
                          {isInCart(book._id) || addedToCart ? 'Added to Cart' : 'Add to Cart'}
                        </button>
                      )}
                      <div className="relative group">
                        <button
                          onClick={(book.barterAvailable || book.priceCents === 0) ? handleTradeRequest : undefined}
                          disabled={(!book.barterAvailable && book.priceCents > 0) || submitting}
                          className={`w-full py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            tradeRequested
                              ? 'bg-green-500 text-white'
                              : (book.barterAvailable || book.priceCents === 0)
                                ? 'bg-[#fb641b] hover:bg-[#e55a17] text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M15.97 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H7.5a.75.75 0 0 1 0-1.5h11.69l-3.22-3.22a.75.75 0 0 1 0-1.06Zm-7.94 9a.75.75 0 0 1 0 1.06l-3.22 3.22H16.5a.75.75 0 0 1 0 1.5H4.81l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                          </svg>
                          {tradeRequested ? 'Requested ✓' : 'Request Trade'}
                        </button>
                        {(!book.barterAvailable && book.priceCents > 0) && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            This book is only available for purchase
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Details */}
              <div className="flex-1 p-6">
                {/* Title & Author */}
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">{book.title}</h1>
                <p className="text-gray-600 mb-4">by <span className="text-[#1e3a5f] font-medium">{book.author}</span></p>

                {/* Ratings - placeholder */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-sm font-medium rounded">
                    4.5 ★
                  </span>
                  <span className="text-gray-500 text-sm">Based on condition</span>
                </div>

                {/* Price Section */}
                <div className="border-t border-b border-gray-100 py-4 mb-4">
                  {book.priceCents > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900">₹{Math.floor(book.priceCents / 100)}</span>
                      {book.priceCents % 100 > 0 && (
                        <span className="text-xl font-bold text-gray-900">.{String(book.priceCents % 100).padStart(2, '0')}</span>
                      )}
                      {book.barterAvailable && (
                        <span className="ml-4 px-3 py-1 bg-[#f7941d]/10 text-[#f7941d] text-sm font-medium rounded-full">
                          Also available for trade
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-[#f7941d]">Trade Only</span>
                    </div>
                  )}
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
                        <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-medium text-gray-900">{book.city || book.location?.city || 'India'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
                        <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 1 1 6 0h3a.75.75 0 0 0 .75-.75V15Z" />
                        <path d="M8.25 19.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0ZM15.75 6.75a.75.75 0 0 0-.75.75v11.25c0 .087.015.17.042.248a3 3 0 0 1 5.958.464c.853-.175 1.5-.935 1.5-1.838V8.625c0-.621-.504-1.125-1.125-1.125h-4.5a.75.75 0 0 0-.75.75Z" />
                        <path d="M19.5 19.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Delivery</p>
                      <p className="text-sm font-medium text-gray-900">3-5 business days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Condition</p>
                      <p className="text-sm font-medium text-gray-900">{book.condition}</p>
                    </div>
                  </div>
                  {book.genre && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-600">
                          <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Genre</p>
                        <p className="text-sm font-medium text-gray-900">{book.genre}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Seller Info - Simple (no avatar) */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Seller</p>
                      <p className="font-medium text-gray-900">{owner.name || 'Anonymous Seller'}</p>
                      {owner.reputation && (
                        <p className="text-sm text-gray-600 mt-0.5">
                          ⭐ {owner.reputation.score || 0} rating • {owner.reputation.reviewsCount || 0} reviews
                        </p>
                      )}
                    </div>
                    {!isOwner && (
                      <button
                        onClick={handleMessage}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97ZM6.75 8.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H7.5Z" clipRule="evenodd" />
                        </svg>
                        Message
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{book.description || 'No description provided by the seller.'}</p>
                </div>

                {/* Book Details */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Book Details</h3>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div className="text-gray-500">Condition</div>
                    <div className="text-gray-900 font-medium">{book.condition}</div>
                    
                    {book.genre && (
                      <>
                        <div className="text-gray-500">Genre</div>
                        <div className="text-gray-900 font-medium">{book.genre}</div>
                      </>
                    )}
                    
                    {book.isbn && (
                      <>
                        <div className="text-gray-500">ISBN</div>
                        <div className="text-gray-900 font-medium">{book.isbn}</div>
                      </>
                    )}
                    
                    <div className="text-gray-500">Listed On</div>
                    <div className="text-gray-900 font-medium">{new Date(book.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    
                    <div className="text-gray-500">Availability</div>
                    <div className="text-gray-900 font-medium">
                      {book.barterAvailable ? 'Trade & Purchase' : 'Purchase Only'}
                    </div>
                  </div>
                </div>

                {/* Share Button */}
                <div className="border-t border-gray-100 pt-4 mt-6">
                  <button
                    onClick={shareBook}
                    className="flex items-center gap-2 text-gray-600 hover:text-[#f7941d] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M15.75 4.5a3 3 0 1 1 .825 2.066l-8.421 4.679a3.002 3.002 0 0 1 0 1.51l8.421 4.679a3 3 0 1 1-.729 1.31l-8.421-4.678a3 3 0 1 1 0-4.132l8.421-4.679a3 3 0 0 1-.096-.755Z" clipRule="evenodd" />
                    </svg>
                    Share this book
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          {!isOwner && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
              <div className="flex flex-col gap-2">
                {book.priceCents > 0 && (
                  <button
                    onClick={handleAddToCart}
                    disabled={isInCart(book._id) || addedToCart}
                    className={`w-full py-3 font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                      isInCart(book._id) || addedToCart
                        ? 'bg-green-500 text-white'
                        : 'bg-[#ff9f00] hover:bg-[#e89100] text-white'
                    }`}
                  >
                    {isInCart(book._id) || addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
                  </button>
                )}
                <div className="relative group">
                  <button
                    onClick={(book.barterAvailable || book.priceCents === 0) ? handleTradeRequest : undefined}
                    disabled={(!book.barterAvailable && book.priceCents > 0) || submitting}
                    className={`w-full py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      tradeRequested
                        ? 'bg-green-500 text-white'
                        : (book.barterAvailable || book.priceCents === 0)
                          ? 'bg-[#fb641b] hover:bg-[#e55a17] text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {tradeRequested ? 'Requested ✓' : 'Request Trade'}
                  </button>
                  {(!book.barterAvailable && book.priceCents > 0) && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      This book is only available for purchase
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Books */}
      {relatedBooks.length > 0 && (
        <div className="px-4 py-8 bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Similar Books
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedBooks.map((relBook) => (
                <BookCard key={relBook._id} book={relBook} />
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default BookDetailPage
