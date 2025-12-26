import { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import BookCard from '../components/BookCard';
import { useAuth } from '../context/AuthContext';
import { booksAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

// ============== CONSTANTS ==============
const STATUS_STYLES = {
  available: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  reserved: 'bg-amber-100 text-amber-700 border border-amber-200',
  sold: 'bg-gray-100 text-gray-600 border border-gray-200',
  exchanged: 'bg-blue-100 text-blue-700 border border-blue-200',
};

const SECTIONS = {
  PROFILE: 'profile',
  MY_BOOKS: 'myBooks',
  WISHLIST: 'wishlist',
  ORDER_HISTORY: 'orderHistory',
  ADDRESSES: 'addresses',
  VERIFICATION: 'verification',
};

// ============== ICONS ==============
const Icons = {
  User: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  Edit: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  ),
  Book: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  Heart: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  ),
  Clock: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  MapPin: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.458-7.5 11.458s-7.5-4.316-7.5-11.458a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  ),
  Shield: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  CheckCircle: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  ),
  Message: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  ),
  Logout: ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  ),
};

// ============== SIDEBAR ==============
const Sidebar = ({ activeSection, onSectionChange, wishlistCount, username, isVerified, onLogoutClick }) => {
  const menuItems = [
    { key: SECTIONS.PROFILE, label: 'Edit Profile', icon: Icons.Edit },
    { key: SECTIONS.MY_BOOKS, label: 'My Books', icon: Icons.Book },
    { key: SECTIONS.WISHLIST, label: 'Wishlist', icon: Icons.Heart, count: wishlistCount },
    { key: SECTIONS.ORDER_HISTORY, label: 'Order History', icon: Icons.Clock },
    { key: SECTIONS.ADDRESSES, label: 'Addresses', icon: Icons.MapPin },
    { key: SECTIONS.VERIFICATION, label: 'Verification', icon: Icons.Shield },
  ];

  const handleLogout = () => {
    onLogoutClick();
  };

  return (
    <div className="w-64 bg-white rounded-lg border border-gray-200">
      <div className="p-4 bg-gradient-to-r from-orange-400 to-orange-500 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Icons.User className="w-5 h-5" />
            <span className="font-semibold">{username}</span>
          </div>
          {isVerified ? (
            <span className="px-2 py-1 bg-white/20 text-white text-xs font-medium rounded-full border border-white/30">
              Verified
            </span>
          ) : (
            <span className="px-2 py-1 bg-red-500/90 text-white text-xs font-medium rounded-full">
              Not Verified
            </span>
          )}
        </div>
      </div>

      <nav className="p-3">
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onSectionChange(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-1 ${
              activeSection === item.key
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded font-medium">
                {item.badge}
              </span>
            )}
            {item.count !== undefined && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">
                {item.count}
              </span>
            )}
          </button>
        ))}
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-red-600 hover:bg-red-50"
          >
            <Icons.Logout className="w-5 h-5" />
            <span className="text-sm font-medium flex-1 text-left">Log Out</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

// ============== BOOK CARD ==============
// Using the BookCard component from components/BookCard.jsx

// ============== MY BOOKS SECTION ==============
const MyBooksSection = ({ books, loading }) => {
  const [activeTab, setActiveTab] = useState('forSale');

  const tabs = [
    { key: 'myBooks', label: 'My Books' },
    { key: 'forSale', label: 'For Sale' },
    { key: 'forTrade', label: 'For Trade' },
    { key: 'sold', label: 'Sold' },
    { key: 'traded', label: 'Traded' },
  ];

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your books...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
            )}
          </button>
        ))}
      </div>

      {books.length === 0 ? (
        <div className="text-center py-16">
          <Icons.Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No books yet</h3>
          <p className="text-gray-600">Start adding books to your collection</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-6">
          {books.map((book) => (
            <BookCard key={book._id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============== EDIT PROFILE SECTION ==============
const EditProfileSection = () => {
  const [formData, setFormData] = useState({
    name: 'test2',
    email: 'test2@example.com',
    bio: '',
    location: '',
  });

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          placeholder="Tell us about yourself..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          placeholder="City, Country"
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors">
          Save Changes
        </button>
        <button className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
};

// ============== MAIN COMPONENT ==============
const ProfilePage = () => {
  const [activeSection, setActiveSection] = useState(SECTIONS.MY_BOOKS);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooks = async () => {
      if (user?.id) {
        console.log('Fetching books for user:', user.id);
        try {
          const response = await booksAPI.list({ sellerId: user.id });
          console.log('Books API response:', response);
          setBooks(response.data || []);
          console.log('Books set to:', response.data || []);
        } catch (error) {
          console.error('Failed to fetch books:', error);
          setBooks([]);
        } finally {
          setLoading(false);
        }
      } else {
        console.log('No user id available');
        setLoading(false);
      }
    };

    fetchBooks();
  }, [user?.id]);

  const username = user?.name || "User";
  const isVerified = user?.isVerified || false; // Adjust based on your user object

  const handleLogoutConfirm = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <NavBar />
      
      <div className="pt-20 px-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200">
            <span className="font-semibold text-gray-900">{username}</span>
            <Icons.CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">Verified</span>
          </div>
        </div>

        <div className="flex gap-6">
          <Sidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            wishlistCount={1}
            username={username}
            isVerified={isVerified}
            onLogoutClick={() => setShowLogoutModal(true)}
          />

          <div className="flex-1">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              {activeSection === SECTIONS.PROFILE && <EditProfileSection />}
              {activeSection === SECTIONS.MY_BOOKS && <MyBooksSection books={books} loading={loading} />}
              {activeSection === SECTIONS.WISHLIST && (
                <div className="text-center py-16">
                  <Icons.Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Your wishlist</h3>
                  <p className="text-gray-600">Save books you're interested in</p>
                </div>
              )}
              {activeSection === SECTIONS.ORDER_HISTORY && (
                <div className="text-center py-16">
                  <Icons.Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                  <p className="text-gray-600">Your order history will appear here</p>
                </div>
              )}
              {activeSection === SECTIONS.ADDRESSES && (
                <div className="text-center py-16">
                  <Icons.MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No addresses saved</h3>
                  <p className="text-gray-600">Add delivery addresses</p>
                </div>
              )}
              {activeSection === SECTIONS.VERIFICATION && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <Icons.CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <div className="font-semibold text-gray-900">Email Verified</div>
                        <div className="text-sm text-gray-600">test2@example.com</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Icons.Shield className="w-6 h-6 text-gray-400" />
                      <div>
                        <div className="font-semibold text-gray-900">Phone Verification</div>
                        <div className="text-sm text-gray-600">Not verified</div>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600">
                      Verify
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;