import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { booksAPI, wishlistAPI, reviewsAPI, usersAPI } from '../services/api';

// ============== CONSTANTS ==============
const STATUS_STYLES = {
  available: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  reserved: 'bg-amber-100 text-amber-700 border border-amber-200',
  sold: 'bg-gray-100 text-gray-600 border border-gray-200',
  exchanged: 'bg-blue-100 text-blue-700 border border-blue-200',
};

const TABS = {
  LISTINGS: 'listings',
  WISHLIST: 'wishlist',
  REVIEWS: 'reviews',
};

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop';
const DEFAULT_BOOK_COVER = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop';

// ============== ICONS ==============
const Icons = {
  Location: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
    </svg>
  ),
  Star: ({ className, filled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
    </svg>
  ),
  Plus: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  Calendar: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  Edit: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  ),
};

// ============== CUSTOM HOOK ==============
const useProfileData = (targetUserId, isOwnProfile, isAuthenticated) => {
  const [data, setData] = useState({
    profile: null,
    books: [],
    wishlist: [],
    reviews: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!targetUserId) {
      setError('User not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [profileRes, booksRes, reviewsRes] = await Promise.all([
        usersAPI.getProfile(targetUserId),
        booksAPI.list({ sellerId: targetUserId }),
        reviewsAPI.list({ revieweeId: targetUserId }),
      ]);

      if (!profileRes.data.user) {
        setError('User not found');
        return;
      }

      let wishlistData = [];
      if (isOwnProfile && isAuthenticated) {
        try {
          const wishlistRes = await wishlistAPI.get();
          wishlistData = wishlistRes.data.wishlist || [];
        } catch {
          wishlistData = [];
        }
      }

      setData({
        profile: profileRes.data.user,
        books: booksRes.data || [],
        wishlist: wishlistData,
        reviews: reviewsRes.data.reviews || [],
      });
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [targetUserId, isOwnProfile, isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const removeBook = useCallback((bookId) => {
    setData((prev) => ({
      ...prev,
      books: prev.books.filter((b) => b._id !== bookId),
    }));
  }, []);

  const removeFromWishlist = useCallback((bookId) => {
    setData((prev) => ({
      ...prev,
      wishlist: prev.wishlist.filter((b) => b._id !== bookId),
    }));
  }, []);

  return { ...data, loading, error, removeBook, removeFromWishlist, refetch: fetchData };
};

// ============== SUB-COMPONENTS ==============

const ProfileSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
    <NavBar />
    <div className="pt-24 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-36 h-36 md:w-44 md:h-44 bg-gray-200 rounded-3xl" />
            <div className="flex-1 space-y-4">
              <div className="h-10 bg-gray-200 rounded-lg w-48" />
              <div className="h-5 bg-gray-200 rounded w-64" />
              <div className="h-20 bg-gray-200 rounded-lg" />
              <div className="flex gap-4">
                <div className="h-10 bg-gray-200 rounded-full w-32" />
                <div className="h-10 bg-gray-200 rounded-full w-24" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ErrorState = ({ message }) => (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
    <NavBar />
    <div className="pt-32 px-8 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{message}</h1>
        <p className="text-gray-500 mb-6">The profile you're looking for doesn't exist or has been removed.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e3a5f] text-white rounded-full hover:bg-[#2a4a73] transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  </div>
);

const StatCard = ({ value, label, icon, highlight }) => (
  <div className={`rounded-2xl p-5 text-center transition-all hover:scale-105 ${
    highlight 
      ? 'bg-gradient-to-br from-[#f7941d] to-[#e8850f] text-white shadow-lg shadow-orange-200' 
      : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'
  }`}>
    <div className="flex items-center justify-center gap-2 mb-1">
      {icon}
      <p className={`text-3xl font-bold ${highlight ? 'text-white' : 'text-[#1e3a5f]'}`}>
        {value}
      </p>
    </div>
    <p className={`text-sm font-medium ${highlight ? 'text-white/80' : 'text-gray-500'}`}>
      {label}
    </p>
  </div>
);

const TabButton = ({ active, onClick, children, count }) => (
  <button
    onClick={onClick}
    className={`relative py-4 px-1 text-sm font-semibold capitalize transition-all ${
      active 
        ? 'text-[#1e3a5f]' 
        : 'text-gray-400 hover:text-gray-600'
    }`}
  >
    <span className="flex items-center gap-2">
      {children}
      {count !== undefined && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          active ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-500'
        }`}>
          {count}
        </span>
      )}
    </span>
    {active && (
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f7941d] rounded-full" />
    )}
  </button>
);

const BookCard = ({ book, isOwner, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    setIsDeleting(true);
    try {
      await booksAPI.delete(book._id);
      onDelete(book._id);
    } catch {
      alert('Failed to delete book');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <Link to={`/book/${book._id}`} className="block aspect-[3/4] relative overflow-hidden">
        <img
          src={book.photos?.[0] || DEFAULT_BOOK_COVER}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1.5 text-xs font-semibold rounded-full backdrop-blur-sm ${STATUS_STYLES[book.status] || STATUS_STYLES.available}`}>
            {book.status}
          </span>
        </div>
        {book.price && (
          <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full">
            <span className="text-sm font-bold text-[#1e3a5f]">${book.price}</span>
          </div>
        )}
      </Link>
      <div className="p-4">
        <h3 className="text-gray-900 font-bold mb-1 line-clamp-1 group-hover:text-[#1e3a5f] transition-colors">
          {book.title}
        </h3>
        <p className="text-gray-500 text-sm mb-4 line-clamp-1">{book.author}</p>
        {isOwner && (
          <div className="flex gap-2">
            <Link
              to={`/edit-book/${book._id}`}
              className="flex-1 px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#2a4a73] text-white text-sm font-medium rounded-xl transition-colors text-center flex items-center justify-center gap-2"
            >
              <Icons.Edit className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {isDeleting ? '...' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const WishlistCard = ({ book, onRemove }) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await wishlistAPI.remove(book._id);
      onRemove(book._id);
    } catch {
      // Silent fail
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
      <Link to={`/book/${book._id}`} className="block aspect-[3/4] relative overflow-hidden">
        <img
          src={book.photos?.[0] || DEFAULT_BOOK_COVER}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
      <div className="p-4">
        <h3 className="text-gray-900 font-bold mb-1 line-clamp-1">{book.title}</h3>
        <p className="text-gray-500 text-sm mb-4 line-clamp-1">{book.author}</p>
        <button
          onClick={handleRemove}
          disabled={isRemoving}
          className="w-full px-4 py-2.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {isRemoving ? 'Removing...' : 'Remove from Wishlist'}
        </button>
      </div>
    </div>
  );
};

const ReviewCard = ({ review }) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start gap-4">
      <Link to={`/profile/${review.reviewerId?._id}`} className="shrink-0">
        <img
          src={review.reviewerId?.avatarUrl || DEFAULT_AVATAR}
          alt={review.reviewerId?.name}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 hover:ring-[#f7941d] transition-all"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <Link 
            to={`/profile/${review.reviewerId?._id}`}
            className="font-semibold text-gray-900 hover:text-[#1e3a5f] transition-colors"
          >
            {review.reviewerId?.name || 'Anonymous'}
          </Link>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Icons.Star
                key={i}
                className={`w-4 h-4 ${i < review.rating ? 'text-amber-400' : 'text-gray-200'}`}
              />
            ))}
          </div>
        </div>
        <p className="text-gray-600 leading-relaxed">{review.comment}</p>
        <div className="flex items-center gap-2 mt-3 text-sm text-gray-400">
          <Icons.Calendar className="w-4 h-4" />
          {new Date(review.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>
    </div>
  </div>
);

const EmptyState = ({ icon, title, description, action }) => (
  <div className="text-center py-16">
    <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
    {action}
  </div>
);

// ============== MAIN COMPONENT ==============
const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.LISTINGS);

  const isOwnProfile = !userId || (currentUser && userId === currentUser.id);
  const targetUserId = userId || currentUser?.id;

  const {
    profile,
    books,
    wishlist,
    reviews,
    loading,
    error,
    removeBook,
    removeFromWishlist,
  } = useProfileData(targetUserId, isOwnProfile, isAuthenticated);

  const stats = useMemo(() => ({
    booksCount: books.length,
    tradesCount: books.filter((b) => b.status === 'sold' || b.status === 'exchanged').length,
    rating: profile?.reputation?.score || 0,
    reviewsCount: profile?.reputation?.reviewsCount || 0,
  }), [books, profile]);

  const displayProfile = profile || currentUser;

  const tabs = useMemo(() => {
    const baseTabs = [
      { key: TABS.LISTINGS, label: 'Listings', count: books.length },
    ];
    if (isOwnProfile) {
      baseTabs.push({ key: TABS.WISHLIST, label: 'Wishlist', count: wishlist.length });
    }
    baseTabs.push({ key: TABS.REVIEWS, label: 'Reviews', count: reviews.length });
    return baseTabs;
  }, [isOwnProfile, books.length, wishlist.length, reviews.length]);

  if (loading) return <ProfileSkeleton />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <NavBar />
      
      {/* Profile Header */}
      <header className="pt-24 pb-10 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar */}
            <div className="relative group">
              <img
                src={displayProfile?.avatarUrl || DEFAULT_AVATAR}
                alt={displayProfile?.name}
                className="w-36 h-36 md:w-44 md:h-44 rounded-3xl object-cover ring-4 ring-[#f7941d] shadow-xl shadow-orange-100"
              />
              {isOwnProfile && (
                <button
                  onClick={() => navigate('/settings')}
                  className="absolute -bottom-2 -right-2 p-2.5 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
                  aria-label="Edit profile"
                >
                  <Icons.Edit className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-[#1e3a5f] mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {displayProfile?.name || 'Anonymous'}
                  </h1>
                  <p className="text-gray-500">{displayProfile?.email}</p>
                </div>
                
                {isOwnProfile && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate('/add-book')}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#f7941d] hover:bg-[#e8850f] text-white font-semibold rounded-full transition-all shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:scale-105"
                    >
                      <Icons.Plus className="w-5 h-5" />
                      Add Book
                    </button>
                    <button
                      onClick={logout}
                      className="px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-full transition-colors border border-gray-200 shadow-sm"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>

              <p className="text-gray-600 mb-4 max-w-xl leading-relaxed">
                {displayProfile?.bio || 'No bio provided yet.'}
              </p>

              {displayProfile?.city && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm text-sm text-gray-600">
                  <Icons.Location className="w-4 h-4 text-[#f7941d]" />
                  {displayProfile.city}
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            <StatCard value={stats.booksCount} label="Books Listed" />
            <StatCard value={stats.tradesCount} label="Successful Trades" />
            <StatCard
              value={stats.rating.toFixed(1)}
              label="Rating"
              icon={<Icons.Star className="w-6 h-6 text-amber-400" />}
              highlight
            />
            <StatCard value={stats.reviewsCount} label="Reviews" />
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="border-y border-gray-100 bg-white/80 backdrop-blur-sm sticky top-16 z-40 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-8 overflow-x-auto">
            {tabs.map((tab) => (
              <TabButton
                key={tab.key}
                active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                count={tab.count}
              >
                {tab.label}
              </TabButton>
            ))}
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <main className="flex-1 px-4 sm:px-8 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Listings Tab */}
          {activeTab === TABS.LISTINGS && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isOwnProfile ? 'My Books' : 'Books'}
                </h2>
                {isOwnProfile && books.length > 0 && (
                  <Link
                    to="/add-book"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f7941d] hover:bg-[#e8850f] text-white font-medium rounded-full transition-colors text-sm shadow-lg shadow-orange-200"
                  >
                    <Icons.Plus className="w-4 h-4" />
                    Add Book
                  </Link>
                )}
              </div>

              {books.length === 0 ? (
                <EmptyState
                  icon={<svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
                  title="No books listed yet"
                  description={isOwnProfile ? "Start sharing your books with the community!" : "This user hasn't listed any books yet."}
                  action={isOwnProfile && (
                    <Link
                      to="/add-book"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#f7941d] hover:bg-[#e8850f] text-white font-medium rounded-full transition-colors"
                    >
                      <Icons.Plus className="w-5 h-5" />
                      Add Your First Book
                    </Link>
                  )}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {books.map((book) => (
                    <BookCard
                      key={book._id}
                      book={book}
                      isOwner={isOwnProfile}
                      onDelete={removeBook}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Wishlist Tab */}
          {activeTab === TABS.WISHLIST && isOwnProfile && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">My Wishlist</h2>

              {wishlist.length === 0 ? (
                <EmptyState
                  icon={<svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>}
                  title="Your wishlist is empty"
                  description="Save books you're interested in for later!"
                  action={
                    <Link
                      to="/browse"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e3a5f] hover:bg-[#2a4a73] text-white font-medium rounded-full transition-colors"
                    >
                      Browse Books
                    </Link>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlist.map((book) => (
                    <WishlistCard
                      key={book._id}
                      book={book}
                      onRemove={removeFromWishlist}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Reviews Tab */}
          {activeTab === TABS.REVIEWS && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Reviews</h2>

              {reviews.length === 0 ? (
                <EmptyState
                  icon={<Icons.Star className="w-10 h-10 text-gray-400" />}
                  title="No reviews yet"
                  description={isOwnProfile 
                    ? "Complete more trades to receive reviews from other users!" 
                    : "This user hasn't received any reviews yet."}
                />
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard key={review._id} review={review} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
