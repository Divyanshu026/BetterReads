import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
// import Header from '../components/Header'
import Footer from '../components/Footer'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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

    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      navigate('/profile')
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col">
      {/* <Header headerState="visible" /> */}
      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex items-center justify-center p-8 w-full lg:w-1/2">
          <div className="w-full max-w-md">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 mb-12">
              <img src="/logo.svg" alt="BetterReads" className="h-9" />
              <span className="text-lg font-bold tracking-wide flex" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <span className="text-white">BETTER</span>
                <span className="text-[#f7941d]">READS</span>
              </span>
            </Link>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Welcome back
              </h1>
              <p className="text-stone-400">Sign in to continue your reading journey</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-stone-900 text-stone-500">Sign in with email</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-stone-300 text-sm font-medium">Password</label>
                </div>
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <div className="animate-spin w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full"></div>}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-8 text-center text-stone-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium">
                Sign up free
              </Link>
            </p>
          </div>
        </div>
        {/* Right Side - Image */}
        <div className="hidden lg:block lg:w-1/2 relative min-h-screen">
          <div 
            className="absolute inset-0 h-full w-full bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&fit=crop')" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-900/50 to-transparent"></div>
          </div>
          <div className="absolute bottom-12 left-12 right-12">
            <blockquote className="text-white text-2xl font-light leading-relaxed" style={{ fontFamily: "'Playfair Display', serif" }}>
              "A reader lives a thousand lives before he dies. The man who never reads lives only one."
            </blockquote>
            <p className="text-stone-400 mt-4">— George R.R. Martin</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default LoginPage
