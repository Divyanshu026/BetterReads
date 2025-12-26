import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import BrowsePage from './pages/BrowsePage'
import BookDetailPage from './pages/BookDetailPage'
import ProfilePage from './pages/ProfilePage'
import ResultsPage from './pages/ResultsPage'
import AddBookPage from './pages/AddBookPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatsPage from './pages/ChatsPage'
import ChatPage from './pages/ChatPage'
// 1. Import useEffect here
import React, { useEffect } from 'react' 
import AOS from 'aos'
import 'aos/dist/aos.css'

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#f7941d] border-t-transparent rounded-full"></div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

// Redirect authenticated users away from auth pages
function AuthRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#f7941d] border-t-transparent rounded-full"></div>
      </div>
    )
  }
  
  if (isAuthenticated) {
    return <Navigate to="/profile" replace />
  }
  
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/browse" element={<BrowsePage />} />
      <Route path="/book/:id" element={<BookDetailPage />} />
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      
      {/* Protected Routes */}
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/profile/:userId" element={<ProfilePage />} />
      <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
      <Route path="/add-book" element={<ProtectedRoute><AddBookPage /></ProtectedRoute>} />
      <Route path="/chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
      <Route path="/chat/:chatId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
    </Routes>
  )
}

function App() {
  // 2. Initialize AOS globally here. 
  // This runs once when the app mounts.
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true, // Optional: ensures animation only happens once
    });
  }, []);

  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App