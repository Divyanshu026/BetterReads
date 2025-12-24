import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NavBar from '../components/NavBar'

// Floating particle component for snow/bokeh effect
const Particle = ({ style }) => (
  <div 
    className="absolute rounded-full pointer-events-none"
    style={style}
  />
)

const LandingPage = () => {
  const [particles, setParticles] = useState([])
  const [currentBgIndex, setCurrentBgIndex] = useState(0)
  const [headerState, setHeaderState] = useState('visible') // 'visible', 'hidden', 'solid'
  const { isAuthenticated } = useAuth()

  // High-quality bookstore/library background images
  const heroBackgrounds = [
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1920&q=90', // Grand library with warm lighting
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&q=90', // Bright library with natural light
    'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1920&q=90', // Cozy library aisle
  ]

  // Track scroll position for header visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const buttonsArea = window.innerHeight * 0.65 // Around where buttons are
      
      if (scrollY < 50) {
        // At top - show transparent header
        setHeaderState('visible')
      } else if (scrollY < buttonsArea) {
        // Scrolling through hero - hide header
        setHeaderState('hidden')
      } else {
        // Past buttons area - show solid white header
        setHeaderState('solid')
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Rotate background images every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % heroBackgrounds.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Generate floating particles (soft bokeh/snow effect)
  useEffect(() => {
    const flakes = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 12 + 6,
      delay: Math.random() * 15,
      duration: Math.random() * 15 + 20,
      opacity: Math.random() * 0.4 + 0.2,
      blur: Math.random() * 4 + 2
    }))
    setParticles(flakes)
  }, [])

  return (
    <div className="min-h-screen">
      <NavBar transparent />
      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(100vh) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-20vh) translateX(30px); opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.3); }
          50% { box-shadow: 0 0 40px rgba(255,255,255,0.6); }
        }
        .animate-float { animation: float linear infinite; }
        .animate-fade-in-up { animation: fadeInUp 1s ease-out forwards; opacity: 0; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
      `}</style>

      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background Images with crossfade transition */}
        {heroBackgrounds.map((bg, index) => (
          <div 
            key={index}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out"
            style={{ 
              backgroundImage: `url('${bg}')`,
              opacity: currentBgIndex === index ? 1 : 0,
            }}
          />
        ))}
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Dreamy gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-slate-900/30 via-transparent to-slate-900/50" />

        {/* Floating particles (bokeh/snow) */}
        {particles.map(p => (
          <Particle 
            key={p.id}
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
              animationName: 'float',
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              filter: `blur(${p.blur}px)`,
              opacity: p.opacity
            }}
          />
        ))}

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center pt-20">
          {/* Main Title */}
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2 animate-fade-in-up delay-100"
            style={{ 
              fontFamily: "'Playfair Display', serif", 
              textShadow: '0 4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(255,255,255,0.2)',
              letterSpacing: '0.15em'
            }}
          >
            BETTEREADS
          </h1>
          

          {/* Subheading */}
          <p 
            className="text-lg md:text-xl text-white/80 mb-10 max-w-lg font-light animate-fade-in-up delay-300"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
          >
            Trade books with fellow readers in your neighborhood.
            Read more, Spend less.
            <span className="text-white font-medium"> </span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up delay-400">
            <Link 
              to="/browse" 
              className="px-10 py-4 bg-white/90 hover:bg-white text-stone-800 font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105 backdrop-blur-sm"
            >
              Explore Books
            </Link>
            <Link 
              to="/register" 
              className="px-10 py-4 bg-transparent border-2 border-white/70 hover:border-white hover:bg-white/10 text-white font-semibold rounded-full transition-all hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </div>


        {/* Pagination dots - clickable to change background */}
        <div className="absolute bottom-8 right-8 flex gap-2 z-20">
          {heroBackgrounds.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBgIndex(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                currentBgIndex === index 
                  ? 'bg-white shadow-lg scale-125' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

export default LandingPage
