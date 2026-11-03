import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api, getAllBooks } from '../services/api.js';

export default function ExchangeRequestModal({ book, user, onClose, onCreated }) {
  const dialog = useRef(null);
  const [mine, setMine] = useState([]);
  const [choice, setChoice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); return () => { if (dialog.current?.open) dialog.current.close(); }; }, []);
  useEffect(() => {
    let active = true;
    Promise.all([getAllBooks(`&sellerId=${encodeURIComponent(user.id)}&status=available`), api(`/api/offers?listingId=${encodeURIComponent(book._id)}`)])
      .then(([books, offers]) => { if (!active) return; setMine(books); if (offers.some((offer) => String(offer.proposerId?._id || offer.proposerId) === String(user.id) && offer.status === 'pending')) setError('You already have a pending request for this book.'); })
      .catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [book._id, user.id]);
  async function submit(event) {
    event.preventDefault(); if (!choice || busy || error) return;
    setBusy(true); setError('');
    try {
      const offer = await api('/api/offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId: book._id, type: 'barter', offeredBookIds: [choice] }) });
      let warning = '';
      if (message.trim()) {
        try {
          const chat = await api('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantId: book.ownerId._id }) });
          await api(`/api/chats/${encodeURIComponent(chat._id)}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `About ${book.title}: ${message.trim()}` }) });
        } catch { warning = 'Your request was sent, but your message could not be delivered.'; }
      }
      onCreated(offer, warning);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="exchange-dialog" aria-labelledby="exchange-title" onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }}><div className="exchange-dialog-inner"><button type="button" className="exchange-close" onClick={onClose} aria-label="Close request" disabled={busy}><X size={20} /></button><span className="eyebrow">READER TO READER</span><h2 id="exchange-title">Ask for an exchange</h2><p>Request <strong>{book.title}</strong> from {book.ownerId?.name || 'this reader'}.</p><form className="account-form" onSubmit={submit}><label>Offer one of your available books<select value={choice} onChange={(e) => setChoice(e.target.value)} required disabled={loading || busy}><option value="">Choose a book</option>{mine.map((item) => <option value={item._id} key={item._id}>{item.title}</option>)}</select></label>{!loading && !mine.length && <p>You need an available listing to make an exchange. <a href="/list-book">List a book</a></p>}<label>Message to the reader (optional)<textarea rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} /></label><p className="detail-note">If accepted, both books are immediately marked exchanged.</p>{loading && <p role="status">Loading your books…</p>}{error && <p role="alert" className="account-error">{error}</p>}<button className="button button-red" disabled={busy || loading || !choice || Boolean(error)}>{busy ? 'Sending…' : 'Submit request'}</button></form></div></dialog>;
}
