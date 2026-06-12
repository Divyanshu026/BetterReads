import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { booksAPI } from '../services/api'

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const wrapperRef = useRef(null)
  const debounceRef = useRef(null)

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch suggestions with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce the API call
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await booksAPI.list({ 
          search: searchQuery.trim(),
          limit: 6 
        })
        
        const books = response.data || []
        
        // Create suggestions from books (titles and authors)
        const titleSuggestions = books.map(book => ({
          type: 'book',
          text: book.title,
          author: book.author,
          id: book._id
        }))
        
        // Get unique authors
        const authorSet = new Set(books.map(book => book.author))
        const authorSuggestions = [...authorSet].slice(0, 3).map(author => ({
          type: 'author',
          text: author
        }))
        
        setSuggestions([...titleSuggestions.slice(0, 4), ...authorSuggestions])
        setShowSuggestions(true)
      } catch (error) {
        console.error('Search suggestions error:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setShowSuggestions(false)
    navigate(`/results?category=search&value=${encodeURIComponent(searchQuery)}&title=Search Results`)
  }

  const handleSuggestionClick = (suggestion) => {
    setShowSuggestions(false)
    if (suggestion.type === 'book') {
      // Navigate directly to the book detail page
      navigate(`/book/${suggestion.id}`)
    } else if (suggestion.type === 'author') {
      // Search for all books by this author
      navigate(`/results?category=author&value=${encodeURIComponent(suggestion.text)}&title=Books by ${suggestion.text}`)
    }
  }

  return (
    <div ref={wrapperRef} className="w-full max-w-2xl relative">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center bg-white rounded-lg shadow-xl overflow-hidden">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Search for books by title or author..."
            className="flex-1 px-6 py-4 text-gray-700 text-lg outline-none placeholder-gray-400"
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-4 bg-[#8B5A2B] hover:bg-[#6B4423] text-white font-semibold text-lg transition-colors duration-200 cursor-pointer"
          >
            <svg fill="currentColor" height="22" viewBox="0 0 22 22" width="22" xmlns="http://www.w3.org/2000/svg" className="">
              <path clipRule="evenodd" d="M14.192 15.606a7 7 0 111.414-1.414l3.601 3.601-1.414 1.414-3.6-3.6zM15 10a5 5 0 11-10 0 5 5 0 0110 0z" fillRule="evenodd"></path>
            </svg>
            Find Books
          </button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin w-5 h-5 border-2 border-[#f7941d] border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : (
            <ul>
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.type}-${suggestion.text}-${index}`}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    {suggestion.type === 'book' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#f7941d] flex-shrink-0">
                        <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400 flex-shrink-0">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                      </svg>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium truncate">{suggestion.text}</p>
                      {suggestion.type === 'book' && suggestion.author && (
                        <p className="text-gray-500 text-sm truncate">by {suggestion.author}</p>
                      )}
                      {suggestion.type === 'author' && (
                        <p className="text-gray-500 text-sm">Author</p>
                      )}
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 flex-shrink-0">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar
