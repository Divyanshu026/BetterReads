import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import BookCard from '../components/BookCard';
import { booksAPI } from '../services/api';

// ============== ICONS ==============
const Icons = {
  Book: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  ArrowLeft: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  ),
};

const ResultsPage = () => {
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similarBooks, setSimilarBooks] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  // Get filter parameters from URL
  const category = searchParams.get('category'); // e.g., 'genre', 'status', 'type'
  const value = searchParams.get('value'); // e.g., 'Fiction', 'sold', 'forSale'
  const title = searchParams.get('title') || 'Search Results';

  useEffect(() => {
    const fetchBooks = async () => {
      if (!category || !value) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let params = {};

        // Build filter parameters based on category
        switch (category) {
          case 'genre':
            params.genre = value;
            break;
          case 'search':
            // Use text search query
            params.q = value;
            break;
          case 'status':
            // For status filtering, we might need different handling
            if (value === 'sold') {
              params.status = 'sold';
            } else if (value === 'traded') {
              params.status = 'exchanged';
            }
            break;
          case 'type':
            // Handle sale/trade types
            if (value === 'forSale') {
              // Books for sale (priced, not barter)
              params.minPrice = 1; // Any price > 0
            } else if (value === 'forTrade') {
              // This would require custom filtering on frontend since API doesn't directly support barterAvailable
              // We'll fetch all and filter client-side
            }
            break;
          case 'sellerId':
            params.sellerId = value;
            break;
          default:
            break;
        }

        console.log('Fetching books with params:', params);
        const response = await booksAPI.list(params);
        let filteredBooks = response.data || [];

        // Additional client-side filtering for barterAvailable
        if (category === 'type' && value === 'forTrade') {
          filteredBooks = filteredBooks.filter(book => book.barterAvailable);
        } else if (category === 'type' && value === 'forSale') {
          filteredBooks = filteredBooks.filter(book => !book.barterAvailable && book.priceCents > 0);
        }

        setBooks(filteredBooks);
        console.log('Filtered books:', filteredBooks);
      } catch (error) {
        console.error('Failed to fetch books:', error);
        setError('Failed to load books. Please try again.');
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [category, value]);

  // Fetch similar/recommended books
  useEffect(() => {
    const fetchSimilarBooks = async () => {
      if (loading) return;

      try {
        setSimilarLoading(true);
        let similarParams = { limit: 8 };

        // Try to get books from a different genre or random recommendations
        // If current search is by genre, get books from other genres
        if (category === 'genre' && value) {
          // Fetch all books and filter out the current genre to get "similar" suggestions
          const response = await booksAPI.list({ limit: 20 });
          const allBooks = response.data || [];
          // Filter out books that are already in results and from different genres
          const bookIds = new Set(books.map(b => b._id));
          const filtered = allBooks
            .filter(b => !bookIds.has(b._id))
            .slice(0, 8);
          setSimilarBooks(filtered);
        } else {
          // For other searches, just get some random recommendations
          const response = await booksAPI.list(similarParams);
          const allBooks = response.data || [];
          const bookIds = new Set(books.map(b => b._id));
          const filtered = allBooks
            .filter(b => !bookIds.has(b._id))
            .slice(0, 8);
          setSimilarBooks(filtered);
        }
      } catch (err) {
        console.error('Failed to fetch similar books:', err);
        setSimilarBooks([]);
      } finally {
        setSimilarLoading(false);
      }
    };

    fetchSimilarBooks();
  }, [loading, books, category, value]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="pt-20 px-6 max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading books...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="pt-20 px-6 max-w-7xl mx-auto">
          <div className="text-center py-16">
            <Icons.Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link
              to="/browse"
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Browse Books
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="pt-20 px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 mt-10">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <Icons.ArrowLeft className="w-5 h-5" />
            <span>Back to Profile</span>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2 mt-2 ml-11">{title}</h1>
          <p className="text-gray-600 ml-11">
            {books.length} book{books.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Books Grid */}
        {books.length === 0 ? (
          <div className="text-center py-16">
            <Icons.Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No books found</h3>
            <p className="text-gray-600 mb-6">
              {category === 'genre' ? `No books found in the ${value} category.` :
               category === 'status' ? `No ${value} books found.` :
               category === 'type' ? `No books ${value === 'forSale' ? 'for sale' : 'for trade'} found.` :
               'No books match your criteria.'}
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/browse"
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Browse All Books
              </Link>
              <Link
                to="/profile"
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map((book) => (
              <BookCard key={book._id} book={book} />
            ))}
          </div>
        )}

        {/* Similar Books Section */}
        {!loading && similarBooks.length > 0 && (
          <div className="mt-16 mb-12">
            <div className="border-t border-gray-200 pt-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                You May Also Like
              </h2>
              <p className="text-gray-600 mb-6">
                Discover more books based on your interests
              </p>

              {similarLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {similarBooks.map((book) => (
                    <BookCard key={book._id} book={book} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;