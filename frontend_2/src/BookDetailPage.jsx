import { useEffect, useState } from 'react';
import { ArrowLeft, Heart, MessageCircle, ShoppingBag } from 'lucide-react';
import AccountPanel from './components/AccountPanel.jsx';
import { exampleBooks } from './exampleBooks.js';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const getToken = () => localStorage.getItem('betterreads.authToken') || sessionStorage.getItem('betterreads.authToken');
const readList = (key) => { try { const value = JSON.parse(sessionStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const photoUrl = (url) => url.startsWith('/uploads/') ? apiBase + url : url;

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, options);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('Unable to reach the server. Please try again.');
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Unable to complete this request.');
  return data;
}

export default function BookDetailPage({ id, exampleTitle }) {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [authVersion, setAuthVersion] = useState(0);
  const [showAccount, setShowAccount] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [bag, setBag] = useState(() => readList('betterreads.bag'));
  const [saved, setSaved] = useState(() => readList('betterreads.saved'));
  const [showChat, setShowChat] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatNotice, setChatNotice] = useState('');

  useEffect(() => {
    let active = true;
    if (exampleTitle) {
      const example = exampleBooks.find((item) => item.title === exampleTitle);
      if (example) setBook({ ...example, example: true, photos: [example.cover] });
      else setError('This book could not be found.');
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    request(`/api/books/${encodeURIComponent(id)}`)
      .then((data) => { if (active) setBook(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, exampleTitle]);

  useEffect(() => {
    let active = true;
    const token = getToken();
    if (!token) { setUser(null); return () => { active = false; }; }
    request('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => { if (active) setUser(data.user); })
      .catch(() => { if (active) setUser(null); });
    return () => { active = false; };
  }, [authVersion]);

  useEffect(() => { sessionStorage.setItem('betterreads.bag', JSON.stringify(bag)); }, [bag]);
  useEffect(() => { sessionStorage.setItem('betterreads.saved', JSON.stringify(saved)); }, [saved]);

  async function openChat() {
    if (!user) { setShowAccount(true); return; }
    setShowChat(true);
    setChatError('');
    setChatBusy(true);
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const chats = await request('/api/chats', { headers });
      const existing = chats.find((chat) => String(chat.participant?._id) === String(book.ownerId?._id));
      if (existing) {
        setChatId(existing._id);
        const detail = await request(`/api/chats/${encodeURIComponent(existing._id)}`, { headers });
        setMessages(detail.messages || []);
      }
    } catch (err) { setChatError(err.message); }
    finally { setChatBusy(false); }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get('message') || '').trim();
    if (!text || chatBusy) return;
    setChatBusy(true);
    setChatError('');
    setChatNotice('');
    try {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
      let current = chatId;
      if (!current) {
        const chat = await request('/api/chats', { method: 'POST', headers, body: JSON.stringify({ participantId: book.ownerId._id }) });
        current = chat._id;
        setChatId(current);
      }
      const message = await request(`/api/chats/${encodeURIComponent(current)}/messages`, { method: 'POST', headers, body: JSON.stringify({ text }) });
      setMessages((items) => [...items, message]);
      form.reset();
      setChatNotice('Message sent.');
    } catch (err) { setChatError(err.message); }
    finally { setChatBusy(false); }
  }

  const key = book?.example ? book.title : book?._id;
  const images = book ? (book.photos?.length ? book.photos.map(photoUrl) : ['/covers/placeholder.svg']) : [];
  const isSaved = saved.includes(key);
  const isInBag = bag.includes(key);
  const ownerId = book?.ownerId?._id;
  const isOwner = user && ownerId && String(user.id) === String(ownerId);

  return (
    <div className="book-detail-page">
      <header className="listing-page-header">
        <a className="brand" href="/" aria-label="BetterReads home"><img className="brand-icon" src="/betterreads-reader.png" alt="" /><span className="brand-name">BETTERREADS<small>BOOKS · NEW BEGINNINGS</small></span></a>
        <a className="listing-back" href="/books"><ArrowLeft size={17} aria-hidden="true" /> Back to books</a>
      </header>
      <main className="book-detail-main">
        {loading ? <p role="status">Loading book details…</p> : error ? <p role="alert">{error}</p> : book && (
          <div className="book-detail-layout">
            <section className="detail-gallery" aria-label="Book photos">
              <div className="detail-photo"><img key={images[photoIndex]} src={images[photoIndex]} alt={`${book.title}, photo ${photoIndex + 1} of ${images.length}`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = book.coverFallback || '/covers/placeholder.svg'; }} /></div>
              {images.length > 1 && <div className="detail-thumbnails">{images.map((src, index) => <button key={`${src}-${index}`} type="button" className={photoIndex === index ? 'active' : ''} aria-label={`Show photo ${index + 1}`} aria-pressed={photoIndex === index} onClick={() => setPhotoIndex(index)}><img src={src} alt="" /></button>)}</div>}
            </section>
            <section className="detail-content">
              <span className="eyebrow">{book.example ? 'EXAMPLE BOOK' : 'READER LISTING'}</span>
              <h1>{book.title}</h1>
              <p className="detail-author">by {book.author || 'Unknown author'}</p>
              <strong className="detail-price">{book.example ? book.price : `₹${((book.priceCents || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}</strong>
              <dl className="detail-facts">
                <div><dt>Listed by</dt><dd>{book.example ? 'Example listing' : book.ownerId?.name || 'Reader'}</dd></div>
                <div><dt>Condition</dt><dd>{book.example ? book.state : book.condition}</dd></div>
                <div><dt>Location</dt><dd>{book.location?.city || 'Not provided'}</dd></div>
                {book.genre && <div><dt>Genre</dt><dd>{book.genre}</dd></div>}
              </dl>
              <p className="detail-description">{book.example ? book.note : book.description || 'No description provided.'}</p>
              {book.example && <p className="detail-note">This is an example book and is not available for purchase or chat.</p>}
              {!book.example && book.status !== 'available' && <p className="detail-note">This book is currently {book.status}.</p>}
              <div className="detail-actions">
                <button className="button button-red" type="button" disabled={book.example || book.status !== 'available' || isInBag} onClick={() => setBag((items) => [...items, key])}><ShoppingBag size={17} />{isInBag ? 'Added to bag' : 'Add to bag'}</button>
                <button className="detail-secondary" type="button" aria-pressed={isSaved} onClick={() => setSaved((items) => isSaved ? items.filter((item) => item !== key) : [...items, key])}><Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />{isSaved ? 'Saved' : 'Save to wishlist'}</button>
                {!book.example && <button className="detail-secondary" type="button" disabled={!ownerId || isOwner} onClick={openChat}><MessageCircle size={18} />{isOwner ? 'Your listing' : 'Message reader'}</button>}
              </div>
              <p className="detail-note">The bag and wishlist last for this browser session. Checkout is not available yet.</p>
              {showAccount && <section className="detail-account" aria-label="Log in or sign up"><h2>Log in to message</h2><AccountPanel onAuthenticated={() => { setShowAccount(false); setAuthVersion((n) => n + 1); }} /><button type="button" className="listing-return" onClick={() => setShowAccount(false)}>Close</button></section>}
              {showChat && <section className="detail-chat" aria-labelledby="detail-chat-title"><h2 id="detail-chat-title">Message {book.ownerId?.name || 'the reader'}</h2><p>Ask about this book or arrange an exchange.</p>{messages.length > 0 && <div className="detail-messages">{messages.map((message) => <p key={message._id}><strong>{String(message.senderId?._id || message.senderId) === String(user?.id) ? 'You' : book.ownerId?.name || 'Reader'}</strong> {message.text}</p>)}</div>}<form onSubmit={sendMessage}><label htmlFor="detail-message">Your message</label><textarea id="detail-message" name="message" maxLength={4000} rows={3} required placeholder={`Hi, is ${book.title} still available?`} /><button className="button button-red" type="submit" disabled={chatBusy}>{chatBusy ? 'Please wait…' : 'Send message'}</button></form>{chatError && <p className="account-error" role="alert">{chatError}</p>}{chatNotice && <p role="status">{chatNotice}</p>}</section>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}


