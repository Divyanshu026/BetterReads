import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Footer from '../components/Footer'
import BookCard from '../components/BookCard'
import { booksAPI } from '../services/api'
import NavBar from '../components/NavBar'

const BrowsePage = () => {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  // Fetch suggestions as user types
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const handler = setTimeout(() => {
      booksAPI.suggest(searchQuery.trim())
        .then(res => {
          setSuggestions(res.data || []);
          setShowSuggestions(true);
        })
        .catch(() => {
          setSuggestions([]);
          setShowSuggestions(false);
        });
    }, 200); // debounce
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Hide suggestions on click outside
  useEffect(() => {
    function handleClick(e) {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setLoading(true);
    booksAPI.list({ status: 'available' })
      .then(res => {
        setBooks(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load books');
        setLoading(false);
      });
  }, []);
  // Header state logic (always solid for BrowsePage)
  const headerState = 'solid';
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Constant Header for BrowsePage */}
      <NavBar />
      {/* Main content area with background image */}
      <main
        className="flex-1 flex flex-col items-center justify-start pt-22 pb-10 overflow-y-auto relative"
      >
        {/* Overlay for readability */}
        
        <div className="absolute inset-0 bg-white bg-opacity-30 pointer-events-none" style={{zIndex: 0}}></div>
        <div className="relative z-10 w-full flex flex-col items-center">
        {/* Heading, subheading, and search bar area */}
        <div
          className="w-full flex flex-col items-center justify-center relative overflow-y-auto"
          style={{
            minHeight: 'calc(100vh - 88px)', // 88px is the header height
            maxHeight: 'calc(100vh - 88px)',
            backgroundImage: "url('/browsepage.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay for readability - only behind content */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(30, 41, 59, 0.45)', // dark blue with 45% opacity
            zIndex: 1,
            pointerEvents: 'none',
          }}></div>
          {/* Content above overlay */}
          <div className="w-full flex flex-col items-center" style={{position: 'relative', zIndex: 2}}>
            <h1 className="text-6xl font-light text-white text-center mb-4" style={{ fontFamily: 'Montserrat, Arial, sans-serif', lineHeight: 1.1 }}>
              Find the Book you wish to <br className="hidden md:block" />
              read with ease.
            </h1>
            <p className="text-lg text-white text-center mb-8 max-w-2xl" style={{ fontFamily: 'Montserrat, Arial, sans-serif' }}>
              Read more, Spend Less.
            </p>
            {/* Search bar */}
            <form className="w-full max-w-2xl mx-auto" autoComplete="off" onSubmit={e => e.preventDefault()}>
              <div className="relative w-full" ref={inputRef}>
                <div className="flex items-center bg-white rounded-xl shadow-2xl px-6 py-2 w-full" style={{ minHeight: '64px', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.28)' }}>
                  <svg fill="black" height="22" viewBox="0 0 22 22" width="22" xmlns="http://www.w3.org/2000/svg" className="mr-4">
                    <path clipRule="evenodd" d="M14.192 15.606a7 7 0 111.414-1.414l3.601 3.601-1.414 1.414-3.6-3.6zM15 10a5 5 0 11-10 0 5 5 0 0110 0z" fillRule="evenodd" />
                  </svg>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Search for your book or author. . ."
                    className="bg-transparent outline-none w-full text-gray-700 text-lg"
                    style={{ fontFamily: 'Montserrat, Arial, sans-serif' }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  />
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {suggestions.map((s, idx) => (
                      <li
                        key={s.type + s.value + idx}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-gray-800 text-base"
                        onMouseDown={() => {
                          setSearchQuery(s.value);
                          setShowSuggestions(false);
                        }}
                      >
                        <span className="font-semibold">{s.value}</span>
                        <span className="ml-2 text-xs text-gray-500">{s.type === 'author' ? 'Author' : 'Title'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </form>
          </div>
        </div>
        {/* Featured Books */}
        <section className="w-full max-w-6xl mx-auto mt-10">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800" style={{ fontFamily: 'Montserrat, Arial, sans-serif' }}> <center>Featured Books</center></h2>
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading books...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : books.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No books listed yet.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {books.map(book => (
                <BookCard key={book._id || book.id} book={book} />
              ))}
            </div>
          )}
        </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default BrowsePage
