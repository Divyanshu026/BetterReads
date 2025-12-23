import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
// import Header from '../components/Header'
import Footer from '../components/Footer'

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    city: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const result = await register(formData.email, formData.password, formData.name)
    
    if (result.success) {
      navigate('/profile')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col">
      {/* Logo in header position */}
      <div className="w-full flex items-center justify-start px-6 md:px-10 py-4 ml-50 mt-4">
        <Link to="/" className="flex items-center gap-3 group">
          <svg viewBox="0 0 55 50" className="h-9 transition-transform group-hover:scale-105" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 8 Q5 5, 8 5 L17 5 Q20 5, 20 8 L20 42 Q20 45, 17 45 L8 45 Q5 45, 5 42 Z" fill="#1e3a5f" stroke="#1e3a5f" strokeWidth="1"/>
            <path d="M8 7 L19 7 L19 43 Q13 41, 8 43 Z" fill="#f5f0e6"/>
            <path d="M9 8 L18 8 L18 42 Q13 40, 9 42 Z" fill="#faf7f0" stroke="#1e3a5f" strokeWidth="0.5"/>
            <path d="M13 32 L13 16 M9 20 L13 14 L17 20" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 7 L21 43 Q30 40, 40 43 L40 7 Q30 10, 21 7" fill="#5b9bd5"/>
            <path d="M25 7 L25 43 Q28 41, 31 43 L31 7 Q28 9, 25 7" fill="#f7941d"/>
            <path d="M33 10 Q45 10, 45 18 Q45 24, 37 25 Q47 26, 47 34 Q47 44, 33 44" fill="none" stroke="#1e3a5f" strokeWidth="3" strokeLinecap="round"/>
            <path d="M35 12 Q43 12, 43 18 Q43 23, 37 24" fill="#f7941d" stroke="#f7941d" strokeWidth="2"/>
            <path d="M35 26 Q45 27, 45 34 Q45 42, 35 42" fill="#5b9bd5" stroke="#1e3a5f" strokeWidth="1.5"/>
          </svg>
          <span className="text-lg font-bold tracking-wide transition-colors duration-300 flex" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <span className="text-white">BETTER</span>
            <span className="text-[#f7941d]">READS</span>
          </span>
        </Link>
      </div>
      {/* <Header /> */}
      <div className="flex-1 flex items-center justify-center p-1">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Create your account
            </h1>
            <p className="text-stone-400">Start trading books in your neighborhood</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-stone-300 text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-stone-300 text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-stone-300 text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                required
                disabled={loading}
              />
              <p className="text-stone-500 text-xs mt-1">At least 6 characters</p>
            </div>
            <div>
              <label className="block text-stone-300 text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                name="confirmpassword"
                value={formData.confirmpassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                required
                disabled={loading}
              />
              <p className="text-stone-500 text-xs mt-1">At least 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <div className="animate-spin w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full"></div>}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-stone-400">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default RegisterPage
