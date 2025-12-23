import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Header = ({ headerState = 'solid' }) => {
  const { isAuthenticated } = useAuth();
  return (
    <header className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
      headerState === 'hidden' 
        ? '-top-24 opacity-0' 
        : 'top-0 opacity-100'
    } ${
      headerState === 'solid' 
        ? 'bg-white shadow-md' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <svg viewBox="0 0 55 50" className="h-9 transition-transform group-hover:scale-105" xmlns="http://www.w3.org/2000/svg">
              {/* Book spine / base */}
              <path d="M5 8 Q5 5, 8 5 L17 5 Q20 5, 20 8 L20 42 Q20 45, 17 45 L8 45 Q5 45, 5 42 Z" fill="#1e3a5f" stroke="#1e3a5f" strokeWidth="1"/>
              {/* Left page - cream/white with arrow */}
              <path d="M8 7 L19 7 L19 43 Q13 41, 8 43 Z" fill="#f5f0e6"/>
              <path d="M9 8 L18 8 L18 42 Q13 40, 9 42 Z" fill="#faf7f0" stroke="#1e3a5f" strokeWidth="0.5"/>
              {/* Arrow on left page */}
              <path d="M13 32 L13 16 M9 20 L13 14 L17 20" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Right side - open book forming B */}
              <path d="M21 7 L21 43 Q30 40, 40 43 L40 7 Q30 10, 21 7" fill="#5b9bd5"/>
              {/* Orange accent stripe */}
              <path d="M25 7 L25 43 Q28 41, 31 43 L31 7 Q28 9, 25 7" fill="#f7941d"/>
              {/* Stylized B curves on right */}
              <path d="M33 10 Q45 10, 45 18 Q45 24, 37 25 Q47 26, 47 34 Q47 44, 33 44" fill="none" stroke="#1e3a5f" strokeWidth="3" strokeLinecap="round"/>
              <path d="M35 12 Q43 12, 43 18 Q43 23, 37 24" fill="#f7941d" stroke="#f7941d" strokeWidth="2"/>
              <path d="M35 26 Q45 27, 45 34 Q45 42, 35 42" fill="#5b9bd5" stroke="#1e3a5f" strokeWidth="1.5"/>
            </svg>
            {/* Text: BETTER in dark blue, READS in orange */}
            <span className={`text-lg font-bold tracking-wide transition-colors duration-300 flex ${
              headerState === 'solid' ? '' : 'drop-shadow-md'
            }`} style={{ fontFamily: "'Montserrat', sans-serif" }}>
              <span className={headerState === 'solid' ? 'text-[#1e3a5f]' : 'text-white'}>BETTER</span>
              <span className="text-[#f7941d]">READS</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-10 -ml-30">
            <Link to="/browse" className={`text-base font-normal transition-colors ${
              headerState === 'solid' ? 'text-black hover:text-black/70' : 'text-white/90 hover:text-white drop-shadow-sm'
            }`} style={{ fontFamily: "'Montserrat', sans-serif" }}>Browse Books</Link>
            <Link to="/community" className={`text-base font-normal transition-colors ${
              headerState === 'solid' ? 'text-black hover:text-black/70' : 'text-white/90 hover:text-white drop-shadow-sm'
            }`} style={{ fontFamily: "'Montserrat', sans-serif" }}>Community</Link>
            <Link to="/add-book" className={`text-base font-normal transition-colors ${
              headerState === 'solid' ? 'text-black hover:text-black/70' : 'text-white/90 hover:text-white drop-shadow-sm'
            }`} style={{ fontFamily: "'Montserrat', sans-serif" }}>List a Book</Link>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/chats" className={`w-10 h-10 flex items-center justify-center transition-colors rounded-full ${
                  headerState === 'solid' ? 'text-black hover:text-black/70 hover:bg-gray-100' : 'text-white/80 hover:text-white hover:bg-white/20'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                </Link>
                <Link to="/profile" className={`w-10 h-10 flex items-center justify-center transition-colors rounded-full ${
                  headerState === 'solid' ? 'text-black hover:text-black/70 hover:bg-gray-100' : 'text-white/80 hover:text-white hover:bg-white/20'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className={`hidden md:block px-5 py-2 text-base font-normal transition-colors ${
                  headerState === 'solid' ? 'text-black hover:text-black/70' : 'text-white/90 hover:text-white'
                }`} style={{ fontFamily: "'Montserrat', sans-serif" }}>Sign In</Link>
                <Link to="/register" className="px-7 py-3 bg-amber-500 hover:bg-amber-600 text-white text-base font-normal rounded-full transition-all shadow-lg hover:shadow-amber-500/40" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Join Free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
