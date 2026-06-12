import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'
import { chatsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const ChatsPage = () => {
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true)
        const response = await chatsAPI.list()
        // Backend returns array directly, not wrapped in .chats
        setChats(response.data.chats || response.data || [])
      } catch (error) {
        console.error('Error fetching chats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChats()
  }, [])

  // Get the other participant in the chat
  const getOtherParticipant = (chat) => {
    // Backend returns 'participant' directly (singular), fallback to participants array
    return chat.participant || chat.participants?.find(p => p._id !== user?.id) || chat.participants?.[0]
  }

  // Format timestamp
  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now - d

    if (diff < 86400000) { // Less than 24 hours
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diff < 604800000) { // Less than a week
      return d.toLocaleDateString([], { weekday: 'short' })
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavBar />
      
      <div className="pt-24 pb-12 px-8 flex-1">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1e3a5f]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Messages
            </h1>
            <p className="text-gray-600 mt-2">Chat with book traders</p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-600 mb-6">Start a conversation by messaging a book seller</p>
              <Link to="/browse" className="inline-flex items-center gap-2 px-6 py-3 bg-[#f7941d] hover:bg-[#e8850f] text-white font-medium rounded-full transition-colors">
                Browse Books
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => {
                const otherUser = getOtherParticipant(chat)
                // Backend returns lastMessage as string directly, not in messages array
                const lastMessageText = chat.lastMessage || chat.messages?.[chat.messages.length - 1]?.text || ''
                const hasUnread = chat.unreadCount > 0 || chat.messages?.some(m => !m.readBy?.includes(user?.id) && m.senderId !== user?.id)

                return (
                  <Link 
                    key={chat._id} 
                    to={`/chat/${chat._id}`}
                    className={`block bg-white hover:bg-gray-50 rounded-xl p-4 border transition-colors ${
                      hasUnread ? 'border-[#f7941d]/50 bg-orange-50/30' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar - using initial instead of image */}
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-[#f7941d] flex items-center justify-center text-white text-xl font-semibold">
                          {otherUser?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#f7941d] rounded-full border-2 border-white"></span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-medium truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {otherUser?.name || 'Unknown User'}
                          </h3>
                          <span className="text-gray-500 text-sm shrink-0 ml-2">
                            {formatTime(chat.updatedAt)}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${hasUnread ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                          {lastMessageText || 'No messages yet'}
                        </p>

                        {/* Book reference if available */}
                        {chat.bookId && (
                          <div className="flex items-center gap-2 mt-2">
                            <img 
                              src={chat.bookId.photos?.[0] || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=50'} 
                              alt={chat.bookId.title}
                              className="w-8 h-10 rounded object-cover"
                            />
                            <span className="text-gray-500 text-xs truncate">{chat.bookId.title}</span>
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
                        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default ChatsPage
