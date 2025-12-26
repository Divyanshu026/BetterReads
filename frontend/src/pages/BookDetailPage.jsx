import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'
import BookCard from '../components/BookCard'
import { booksAPI, offersAPI, wishlistAPI, chatsAPI, reviewsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const BookDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState('description')
  const [showContactModal, setShowContactModal] = useState(false)
  const [book, setBook] = useState(null)
  const [relatedBooks, setRelatedBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [inWishlist, setInWishlist] = useState(false)
  const [offerMessage, setOfferMessage] = useState('')
  const [offerType, setOfferType] = useState('barter')
  const [submitting, setSubmitting] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [sellerReviews, setSellerReviews] = useState([])

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

        // Fetch seller reviews
        const ownerId = response.data.sellerId?._id || response.data.ownerId?._id
        if (ownerId) {
          try {
            const reviewsResponse = await reviewsAPI.list({ revieweeId: ownerId, limit: 5 })
            setSellerReviews(reviewsResponse.data)
          } catch (e) {
            console.error('Reviews fetch error:', e)
          }
        }
      } catch (error) {
        console.error('Error fetching book:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBook()
  }, [id, isAuthenticated])

  // Image navigation
  const nextImage = () => {
    if (book?.photos?.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % book.photos.length)
    }
  }

  const prevImage = () => {
    if (book?.photos?.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + book.photos.length) % book.photos.length)
    }
  }

  const selectImage = (index) => {
    setCurrentImageIndex(index)
  }

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

  // Handle trade request
  const handleTradeRequest = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setSubmitting(true)
    try {
      // Create offer
      await offersAPI.create({
        listingId: id,
        type: offerType,
        amountCents: offerType === 'purchase' ? book.priceCents : undefined,
      })

      // Start chat with owner
      const chatResponse = await chatsAPI.create(book.sellerId?._id || book.ownerId?._id)

      // Send initial message if provided
      if (offerMessage.trim()) {
        await chatsAPI.sendMessage(chatResponse.data._id, offerMessage)
      }

      setShowContactModal(false)
      navigate(`/chat/${chatResponse.data._id}`)
    } catch (error) {
      console.error('Trade request error:', error)
      alert(error.response?.data?.error?.message || 'Failed to send trade request')
    } finally {
      setSubmitting(false)
    }
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
      <div className="min-h-screen bg-white">
        <NavBar />
        <div className="pt-24 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="aspect-3/4 bg-gray-200 rounded-2xl"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-white">
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
    <div className="min-h-screen bg-white flex flex-col">
      <NavBar />

      {/* Breadcrumb */}
      <div className="pt-24 px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-[#f7941d] transition-colors">Home</Link>
            <span>/</span>
            <Link to="/browse" className="hover:text-[#f7941d] transition-colors">Browse</Link>
            <span>/</span>
            <span className="text-gray-700">{book.title}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left - Images */}
            <div className="space-y-4">
              {/* Main Image with Carousel */}
              <div className="relative aspect-3/4 rounded-2xl overflow-hidden bg-gray-100 group">
                <img
                  src={images[currentImageIndex]}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectImage(idx)}
                      className={`flex-shrink-0 w-20 h-28 rounded-lg overflow-hidden border-2 transition-colors ${
                        idx === currentImageIndex ? 'border-[#f7941d]' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right - Details */}
            <div className="space-y-6">
              {/* Badges and Share */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <span className={`px-4 py-1.5 text-white text-sm font-semibold rounded-full ${
                    book.barterAvailable ? 'bg-[#f7941d]' : 'bg-green-500'
                  }`}>
                    {book.barterAvailable ? 'Available for Trade' : 'For Sale'}
                  </span>
                  <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-700 text-sm font-medium rounded-full">
                    {book.condition}
                  </span>
                </div>
                <button
                  onClick={shareBook}
                  className="p-2 text-gray-400 hover:text-[#f7941d] transition-colors"
                  title="Share this book"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              </div>

              {/* Title & Author */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1e3a5f] mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {book.title}
                </h1>
                <p className="text-xl text-gray-600 mb-4">by {book.author}</p>
              </div>

              {/* Price */}
              {book.priceCents > 0 && (
                <div className="flex items-center gap-4">
                  <p className="text-3xl font-bold text-[#f7941d]">
                    ${(book.priceCents / 100).toFixed(2)}
                  </p>
                  {book.barterAvailable && (
                    <span className="text-gray-500 text-sm">or trade</span>
                  )}
                </div>
              )}

              {/* Location and Shipping Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[#f7941d]">
                    <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                  </svg>
                  <span>{book.city || book.location?.city || 'Location not specified'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-5 h-5 text-[#f7941d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>Ships within 3-5 business days</span>
                </div>
              </div>

              {/* Owner Card */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={owner.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop'}
                      alt={owner.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#f7941d]"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{owner.name || 'Anonymous'}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[#f7941d]">
                            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                          </svg>
                          <span>{owner.reputation?.score || 0}</span>
                        </div>
                        <span className="text-gray-400">•</span>
                        <span>{owner.reputation?.reviewsCount || 0} reviews</span>
                      </div>
                    </div>
                  </div>
                </div>

                {!isOwner && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowContactModal(true)}
                      className="flex-1 px-6 py-3 bg-[#f7941d] hover:bg-[#e8850f] text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#f7941d]/25"
                    >
                      {book.barterAvailable ? 'Request Trade' : 'Buy Now'}
                    </button>
                    <button
                      onClick={handleMessage}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
                    >
                      Message
                    </button>
                    <button
                      onClick={handleWishlistToggle}
                      className={`px-4 py-3 rounded-xl transition-colors ${
                        inWishlist
                          ? 'bg-[#f7941d] text-white'
                          : 'bg-gray-600 hover:bg-gray-700 text-white'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Seller Reviews Preview */}
              {sellerReviews.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Reviews</h3>
                  <div className="space-y-3">
                    {sellerReviews.slice(0, 3).map((review) => (
                      <div key={review._id} className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-[#f7941d] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {review.reviewerId?.name?.[0] || '?'}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${i < review.rating ? 'text-[#f7941d]' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">{review.reviewerId?.name || 'Anonymous'}</span>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-gray-700">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {sellerReviews.length > 3 && (
                    <Link
                      to={`/user/${owner._id}/reviews`}
                      className="text-[#f7941d] hover:text-[#e8850f] text-sm font-medium mt-3 inline-block"
                    >
                      View all {sellerReviews.length} reviews →
                    </Link>
                  )}
                </div>
              )}

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex gap-8">
                  {['description', 'details', 'shipping'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-4 text-sm font-medium capitalize transition-colors relative ${
                        activeTab === tab ? 'text-[#f7941d]' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab}
                      {activeTab === tab && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f7941d]"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'description' && (
                <div className="py-4">
                  <p className="text-gray-700 leading-relaxed">{book.description || 'No description provided.'}</p>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="py-4 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <span className="text-gray-500 text-sm">Genre</span>
                    <p className="text-gray-900 font-medium mt-1">{book.genre || 'Not specified'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <span className="text-gray-500 text-sm">Condition</span>
                    <p className="text-gray-900 font-medium mt-1">{book.condition}</p>
                  </div>
                  {book.isbn && (
                    <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                      <span className="text-gray-500 text-sm">ISBN</span>
                      <p className="text-gray-900 font-medium mt-1">{book.isbn}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                    <span className="text-gray-500 text-sm">Listed</span>
                    <p className="text-gray-900 font-medium mt-1">{new Date(book.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className="py-4 space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Shipping Information</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Ships within 3-5 business days</li>
                      <li>• Free shipping on orders over $25</li>
                      <li>• Tracking number provided</li>
                      <li>• Returns accepted within 14 days</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Payment Methods</h4>
                    <div className="flex gap-2">
                      <span className="text-sm text-gray-700">Credit Card, PayPal, Bank Transfer</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Books */}
      {relatedBooks.length > 0 && (
        <div className="px-8 py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1e3a5f] mb-8" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Similar Books You Might Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedBooks.map((relBook) => (
                <BookCard key={relBook._id} book={relBook} />
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-gray-200">
            <h3 className="text-2xl font-bold text-[#1e3a5f] mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {book.barterAvailable ? 'Request Trade' : 'Purchase Request'}
            </h3>
            <p className="text-gray-600 mb-6">
              Send a message to {owner.name} about {book.barterAvailable ? 'trading' : 'buying'} "{book.title}".
            </p>

            {/* Offer Type */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">Type</label>
              <div className="flex gap-3">
                {book.barterAvailable && (
                  <button
                    type="button"
                    onClick={() => setOfferType('barter')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      offerType === 'barter' ? 'bg-[#f7941d] text-white' : 'bg-gray-600 text-white'
                    }`}
                  >
                    Trade
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOfferType('purchase')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    offerType === 'purchase' ? 'bg-[#f7941d] text-white' : 'bg-gray-600 text-white'
                  }`}
                >
                  Buy
                </button>
              </div>
            </div>

            <textarea
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              placeholder={`Hi! I'm interested in ${book.barterAvailable ? 'trading for' : 'buying'} this book. ${book.barterAvailable ? 'I have...' : ''}`}
              className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#f7941d] resize-none mb-4"
            ></textarea>
            <div className="flex gap-3">
              <button
                onClick={() => setShowContactModal(false)}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTradeRequest}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-[#f7941d] hover:bg-[#e8850f] text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <div className="animate-spin w-4 h-4 border-white border-t-transparent rounded-full"></div>}
                {submitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookDetailPage
