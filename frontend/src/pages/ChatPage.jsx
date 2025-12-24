import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { chatsAPI } from '../services/api'
import { initSocket, joinChat, leaveChat, sendSocketMessage, onMessage } from '../services/socket'
import { useAuth } from '../context/AuthContext'

const ChatPage = () => {
  const { chatId } = useParams()
  const { user } = useAuth()
  const [chat, setChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)

  // Get other participant
  const getOtherParticipant = () => {
    return chat?.participants?.find(p => p._id !== user?.id) || chat?.participants?.[0]
  }

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch chat data
  useEffect(() => {
    const fetchChat = async () => {
      try {
        setLoading(true)
        const response = await chatsAPI.get(chatId)
        setChat(response.data.chat)
        setMessages(response.data.chat.messages || [])

        // Mark as read
        await chatsAPI.markAsRead(chatId)
      } catch (error) {
        console.error('Error fetching chat:', error)
      } finally {
        setLoading(false)
      }
    }

    if (chatId) {
      fetchChat()
    }
  }, [chatId])

  // Socket connection
  useEffect(() => {
    if (!chatId || !user) return

    // Initialize socket
    socketRef.current = initSocket()
    
    // Join chat room
    joinChat(chatId)

    // Listen for new messages
    const cleanup = onMessage((message) => {
      if (message.chatId === chatId) {
        setMessages(prev => [...prev, message])
      }
    })

    return () => {
      leaveChat(chatId)
      cleanup()
    }
  }, [chatId, user])

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const content = newMessage.trim()
    setNewMessage('')
    setSending(true)

    try {
      // Optimistically add message
      const optimisticMessage = {
        _id: Date.now(),
        senderId: user?.id,
        content,
        createdAt: new Date().toISOString()
      }
      setMessages(prev => [...prev, optimisticMessage])

      // Send via API
      const response = await chatsAPI.sendMessage(chatId, content)
      
      // Send via socket for real-time
      sendSocketMessage(chatId, content, user?.id)

      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(m => m._id === optimisticMessage._id ? response.data.message : m)
      )
    } catch (error) {
      console.error('Send message error:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m._id !== Date.now()))
    } finally {
      setSending(false)
    }
  }

  // Format timestamp
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  }

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = []
    let currentDate = null

    messages.forEach(message => {
      const messageDate = new Date(message.createdAt).toDateString()
      if (messageDate !== currentDate) {
        currentDate = messageDate
        groups.push({ type: 'date', date: message.createdAt })
      }
      groups.push({ type: 'message', ...message })
    })

    return groups
  }

  const otherUser = getOtherParticipant()

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="pt-24 px-8 flex items-center justify-center h-[calc(100vh-96px)]">
          <div className="animate-spin w-8 h-8 border-2 border-[#f7941d] border-t-transparent rounded-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavBar />
      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-20 pb-24 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Book info banner */}
          {chat?.bookId && (
            <div className="bg-white rounded-xl p-4 flex items-center gap-4 mb-6">
              <img 
                src={chat.bookId.photos?.[0] || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100'} 
                alt={chat.bookId.title}
                className="w-16 h-20 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-gray-500 text-sm">Conversation about</p>
                <h3 className="text-white font-medium truncate">{chat.bookId.title}</h3>
                <p className="text-gray-600 text-sm">{chat.bookId.author}</p>
              </div>
            </div>
          )}

          {groupMessagesByDate().map((item, idx) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${idx}`} className="flex items-center justify-center py-4">
                  <span className="text-gray-500 text-sm bg-white px-4 py-1 rounded-full">
                    {formatDate(item.date)}
                  </span>
                </div>
              )
            }

            const isOwn = item.senderId === user?.id || item.senderId?._id === user?.id
            return (
              <div key={item._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                  {!isOwn && (
                    <img 
                      src={otherUser?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50'} 
                      alt=""
                      className="w-6 h-6 rounded-full object-cover mb-1"
                    />
                  )}
                  <div className={`rounded-2xl px-4 py-2 ${
                    isOwn 
                      ? 'bg-[#f7941d] text-white rounded-tr-sm' 
                      : 'bg-white text-white rounded-tl-sm'
                  }`}>
                    <p className="wrap-break-word">{item.content}</p>
                  </div>
                  <p className={`text-stone-600 text-xs mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                    {formatTime(item.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-[#f7941d] transition-colors"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-[#f7941d] hover:bg-[#f7941d] text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatPage
