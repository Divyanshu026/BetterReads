import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { booksAPI, wishlistAPI, reviewsAPI, usersAPI } from '../services/api'

const ProfilePage = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, isAuthenticated, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('listings')
  const [profile, setProfile] = useState(null)
  const [myBooks, setMyBooks] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  // Determine if viewing own profile
  const isOwnProfile = !userId || (currentUser && userId === currentUser.id)
  const targetUserId = userId || currentUser?.id

  // Fetch profile data
  useEffect(() => {
    const fetchData = async () => {
      if (!targetUserId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Fetch user profile
        const profileResponse = await usersAPI.getProfile(targetUserId)
        setProfile(profileResponse.data.user)

        // Fetch user's books
        const booksResponse = await booksAPI.list({ sellerId: targetUserId })
        setMyBooks(booksResponse.data)

        // Fetch reviews about this user
        const reviewsResponse = await reviewsAPI.list({ revieweeId: targetUserId })
        setReviews(reviewsResponse.data.reviews || [])

        // Fetch wishlist only for own profile
        if (isOwnProfile && isAuthenticated) {
          try {
            const wishlistResponse = await wishlistAPI.get()
            setWishlist(wishlistResponse.data.wishlist || [])
          } catch (e) {
            console.error('Wishlist fetch error:', e)
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [targetUserId, isOwnProfile, isAuthenticated])

  // Delete book
  const handleDeleteBook = async (bookId) => {
    if (!confirm('Are you sure you want to delete this book?')) return

    try {
      await booksAPI.delete(bookId)
      setMyBooks(prev => prev.filter(b => b._id !== bookId))
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete book')
    }
  }

  // Remove from wishlist
  const handleRemoveFromWishlist = async (bookId) => {
    try {
      await wishlistAPI.remove(bookId)
      setWishlist(prev => prev.filter(b => b._id !== bookId))
    } catch (error) {
      console.error('Wishlist remove error:', error)
    }
  }

  const statusColors = {
    'available': 'bg-emerald-500/20 text-emerald-400',
    'reserved': 'bg-amber-500/20 text-amber-400',
    'sold': 'bg-stone-500/20 text-gray-500',
    'exchanged': 'bg-blue-500/20 text-blue-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-24 px-8">
          <div className="max-w-5xl mx-auto">
            <div className="animate-pulse flex gap-8">
              <div className="w-40 h-40 bg-gray-100 rounded-2xl"></div>
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-gray-100 rounded w-1/3"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                <div className="h-16 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile && !isOwnProfile) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="pt-24 px-8 text-center">
          <h1 className="text-2xl text-gray-900">User not found</h1>
        </div>
      </div>
    )
  }

  const displayProfile = profile || currentUser

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      
      {/* Profile Header */}
      <div className="pt-24 pb-8 px-8 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="relative">
              <img 
                src={displayProfile?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop'} 
                alt={displayProfile?.name}
                className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-[#f7941d]"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {displayProfile?.name || 'Anonymous'}
                  </h1>
                  <p className="text-gray-500">{displayProfile?.email}</p>
                </div>
                {isOwnProfile && (
                  <div className="flex gap-3 md:ml-auto">
                    <button 
                      onClick={() => navigate('/add-book')}
                      className="px-6 py-2.5 bg-[#f7941d] hover:bg-[#e8850f] text-white font-medium rounded-full transition-colors text-sm"
                    >
                      Add Book
                    </button>
                    <button 
                      onClick={logout}
                      className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-full transition-colors text-sm"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>

              <p className="text-gray-600 mb-4 max-w-xl">{displayProfile?.bio || 'No bio provided'}</p>

              <div className="flex flex-wrap gap-6 text-sm">
                {displayProfile?.city && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                    </svg>
                    {displayProfile.city}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-[#1e3a5f]">{myBooks.length}</p>
              <p className="text-gray-500 text-sm">Books Listed</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
              <p className="text-2xl font-bold text-[#1e3a5f]">{myBooks.filter(b => b.status === 'sold' || b.status === 'exchanged').length}</p>
              <p className="text-gray-500 text-sm">Trades</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
              <div className="flex items-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
                  <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                </svg>
                <p className="text-2xl font-bold text-gray-900">{displayProfile?.reputation?.score || 0}</p>
              </div>
              <p className="text-gray-400 text-sm">Rating</p>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 text-center border border-gray-200">
              <p className="text-2xl font-bold text-gray-900">{displayProfile?.reputation?.reviewsCount || 0}</p>
              <p className="text-gray-400 text-sm">Reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-8">
            {['listings', ...(isOwnProfile ? ['wishlist'] : []), 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium capitalize transition-colors relative ${
                  activeTab === tab ? 'text-amber-400' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"></span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-8 py-12">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'listings' && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-gray-900">{isOwnProfile ? 'My' : ''} Books ({myBooks.length})</h2>
                {isOwnProfile && (
                  <Link to="/add-book" className="px-6 py-2.5 bg-amber-500 hover:bg-[#e8850f] text-stone-900 font-medium rounded-full transition-colors text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Book
                  </Link>
                )}
              </div>

              {myBooks.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500">No books listed yet</p>
                  {isOwnProfile && (
                    <Link to="/add-book" className="text-amber-400 hover:text-amber-300 mt-2 inline-block">
                      Add your first book
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myBooks.map((book) => (
                    <div key={book._id} className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden border border-gray-200">
                      <Link to={`/book/${book._id}`} className="block aspect-[3/4] relative">
                        <img src={book.photos?.[0] || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop'} alt={book.title} className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[book.status] || statusColors.available}`}>
                            {book.status}
                          </span>
                        </div>
                      </Link>
                      <div className="p-4">
                        <h3 className="text-gray-900 font-semibold mb-1">{book.title}</h3>
                        <p className="text-gray-500 text-sm mb-4">{book.author}</p>
                        {isOwnProfile && (
                          <div className="flex gap-2">
                            <Link to={`/book/${book._id}`} className="flex-1 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-gray-900 text-sm rounded-lg transition-colors text-center">
                              View
                            </Link>
                            <button 
                              onClick={() => handleDeleteBook(book._id)}
                              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && isOwnProfile && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-8">Wishlist ({wishlist.length})</h2>
              {wishlist.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500">Your wishlist is empty</p>
                  <Link to="/browse" className="text-amber-400 hover:text-amber-300 mt-2 inline-block">
                    Browse books
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlist.map((book) => (
                    <div key={book._id} className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden border border-gray-200">
                      <Link to={`/book/${book._id}`} className="block aspect-[3/4]">
                        <img src={book.photos?.[0] || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop'} alt={book.title} className="w-full h-full object-cover" />
                      </Link>
                      <div className="p-4">
                        <h3 className="text-gray-900 font-semibold mb-1">{book.title}</h3>
                        <p className="text-gray-500 text-sm mb-4">{book.author}</p>
                        <button 
                          onClick={() => handleRemoveFromWishlist(book._id)}
                          className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-8">Reviews ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500">No reviews yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review._id} className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 border border-gray-200">
                      <div className="flex items-start gap-4">
                        <img 
                          src={review.reviewerId?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'} 
                          alt={review.reviewerId?.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-900 font-medium">{review.reviewerId?.name}</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${i < review.rating ? 'text-amber-400' : 'text-stone-600'}`}>
                                  <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-500">{review.comment}</p>
                          <p className="text-stone-600 text-sm mt-2">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default ProfilePage
