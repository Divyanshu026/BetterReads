import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = ({ transparent = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuth()

  const isActive = (path) => location.pathname === path

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className={`transition-all duration-300 ${transparent ? 'bg-transparent' : 'bg-white/80 backdrop-blur-md border-b border-stone-200/50 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/logo.svg" alt="BetterReads" className="h-9 group-hover:scale-105 transition-transform" />
              <span className="text-lg font-bold tracking-wide flex" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <span className="text-[#1e3a5f]">BETTER</span>
                <span className="text-[#f7941d]">READS</span>
              </span>
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden lg:flex items-center gap-1">
              <Link 
                to="/browse" 
                className={`px-4 py-2 text-sm font-medium tracking-wide transition-colors ${isActive('/browse') ? 'text-amber-700' : 'text-stone-600 hover:text-amber-700'}`}
              >
                Browse Books
              </Link>
              
              {/* Categories Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => toggleDropdown('categories')}
                  className="flex items-center gap-1 px-4 py-2 text-stone-600 hover:text-amber-700 text-sm font-medium tracking-wide transition-colors"
                >
                  Categories
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
                {openDropdown === 'categories' && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-lg py-2 border border-stone-200/50">
                    {['Fiction', 'Non-Fiction', 'Mystery', 'Sci-Fi', 'Romance', 'Biography'].map(cat => (
                      <Link key={cat} to={`/browse?genre=${cat}`} className="block px-4 py-2 text-stone-600 hover:text-amber-700 hover:bg-amber-50 text-sm" onClick={() => setOpenDropdown(null)}>
                        {cat}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              
              <Link 
                to="/community" 
                className={`px-4 py-2 text-sm font-medium tracking-wide transition-colors ${isActive('/community') ? 'text-amber-700' : 'text-stone-600 hover:text-amber-700'}`}
              >
                Community
              </Link>
              <Link 
                to="/add-book" 
                className={`px-4 py-2 text-sm font-medium tracking-wide transition-colors ${isActive('/add-book') ? 'text-amber-700' : 'text-stone-600 hover:text-amber-700'}`}
              >
                List a Book
              </Link>

              {/* More Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => toggleDropdown('more')}
                  className="flex items-center gap-1 px-4 py-2 text-stone-600 hover:text-amber-700 text-sm font-medium tracking-wide transition-colors"
                >
                  More
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
                {openDropdown === 'more' && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-lg py-2 border border-stone-200/50">
                    <a href="#" className="block px-4 py-2 text-stone-600 hover:text-amber-700 hover:bg-amber-50 text-sm">About Us</a>
                    <a href="#" className="block px-4 py-2 text-stone-600 hover:text-amber-700 hover:bg-amber-50 text-sm">Community</a>
                    <a href="#" className="block px-4 py-2 text-stone-600 hover:text-amber-700 hover:bg-amber-50 text-sm">Help Center</a>
                  </div>
                )}
              </div>
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  {/* Messages Icon */}
                  <Link 
                    to="/chats" 
                    className="hidden md:flex w-10 h-10 items-center justify-center text-stone-500 hover:text-amber-700 transition-colors rounded-full hover:bg-amber-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                    </svg>
                  </Link>

                  {/* Wishlist Icon */}
                  <Link 
                    to="/profile?tab=wishlist" 
                    className="hidden md:flex w-10 h-10 items-center justify-center text-stone-500 hover:text-amber-700 transition-colors rounded-full hover:bg-amber-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                    </svg>
                  </Link>

                  {/* Profile Icon */}
                  <Link 
                    to="/profile" 
                    className="hidden md:flex w-10 h-10 items-center justify-center text-stone-500 hover:text-amber-700 transition-colors rounded-full hover:bg-amber-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="hidden md:block px-4 py-2 text-sm text-stone-600 hover:text-amber-700 font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    to="/register" 
                    className="hidden md:block px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm rounded-full transition-colors shadow-sm"
                  >
                    Join Free
                  </Link>
                </>
              )}

              {/* Mobile Menu Button */}
              <button 
                className="lg:hidden text-stone-600 hover:text-amber-700 transition-colors p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-t border-stone-200/50">
          <nav className="max-w-7xl mx-auto px-8 py-6 flex flex-col gap-4">
            <Link to="/browse" className="text-stone-600 hover:text-amber-700 text-sm font-medium py-2" onClick={() => setIsMenuOpen(false)}>Browse Books</Link>
            <Link to="/how-it-works" className="text-stone-600 hover:text-amber-700 text-sm font-medium py-2" onClick={() => setIsMenuOpen(false)}>How It Works</Link>
            <Link to="/add-book" className="text-stone-600 hover:text-amber-700 text-sm font-medium py-2" onClick={() => setIsMenuOpen(false)}>List a Book</Link>
            {isAuthenticated ? (
              <>
                <Link to="/chats" className="text-stone-600 hover:text-amber-700 text-sm font-medium py-2" onClick={() => setIsMenuOpen(false)}>Messages</Link>
                <Link to="/profile" className="text-stone-600 hover:text-amber-700 text-sm font-medium py-2" onClick={() => setIsMenuOpen(false)}>My Profile</Link>
                <button onClick={() => { logout(); setIsMenuOpen(false); }} className="text-left text-red-500 text-sm font-medium py-2">Sign Out</button>
              </>
            ) : (
              <div className="flex gap-4 pt-4 border-t border-stone-200">
                <Link to="/login" className="px-6 py-2.5 text-sm text-stone-600 font-medium" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                <Link to="/register" className="px-6 py-2.5 bg-amber-600 text-white font-medium text-sm rounded-full" onClick={() => setIsMenuOpen(false)}>Join Free</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Navbar
