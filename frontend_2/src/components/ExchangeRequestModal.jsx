import { appPath } from '../services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api, getAllBooks } from '../services/api.js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const nativeSelect = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50';

export default function ExchangeRequestModal({ book, user, onClose, onCreated }) {
  const dialog = useRef(null);
  const [mine, setMine] = useState([]);
  const [choice, setChoice] = useState('');
  const [type, setType] = useState(book.barterAvailable ? 'barter' : 'borrow');
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
    event.preventDefault(); if ((type === 'barter' && !choice) || busy || error) return;
    setBusy(true); setError('');
    try {
      const offer = await api('/api/offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId: book._id, type, offeredBookIds: type === 'barter' ? [choice] : [] }) });
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
  return <dialog ref={dialog} className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-32px)] w-[min(480px,calc(100%-32px))] overflow-y-auto rounded-xl bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50 font-sans" aria-labelledby="exchange-title" onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }}><div className="relative p-6">
    <button type="button" className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50" onClick={onClose} aria-label="Close request" disabled={busy}><X size={18} /></button>
    <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Reader to reader</span>
    <h2 id="exchange-title" className="font-heading text-xl font-semibold">Ask for an exchange or borrow</h2>
    <p className="mt-1 text-sm text-muted-foreground">Request <strong className="font-medium text-foreground">{book.title}</strong> from {book.ownerId?.name || 'this reader'}.</p>
    <form className="mt-4 flex flex-col gap-4" onSubmit={submit}>
      <label className="flex flex-col gap-1.5 text-sm font-medium">Request type<select value={type} onChange={(event) => setType(event.target.value)} disabled={busy} className={nativeSelect}>{book.barterAvailable && <option value="barter">Exchange</option>}{book.borrowAvailable && <option value="borrow">Borrow</option>}</select></label>
      {type === 'barter' && <><label className="flex flex-col gap-1.5 text-sm font-medium">Offer one of your available books<select value={choice} onChange={(e) => setChoice(e.target.value)} required disabled={loading || busy} className={nativeSelect}><option value="">Choose a book</option>{mine.map((item) => <option value={item._id} key={item._id}>{item.title}</option>)}</select></label>{!loading && !mine.length && <p className="text-sm text-muted-foreground">You need an available listing to make an exchange. <a className="font-medium text-foreground hover:underline" href={appPath('/list-book')}>List a book</a></p>}</>}
      <label className="flex flex-col gap-1.5 text-sm font-medium">Message to the reader (optional)<Textarea rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
      <p className="text-xs text-muted-foreground">{type === 'barter' ? 'If accepted, both books are immediately marked exchanged.' : 'If accepted, the book is reserved for this request.'}</p>
      {loading && <p role="status" className="text-sm text-muted-foreground">Loading your books…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy || loading || (type === 'barter' && !choice) || Boolean(error)}>{busy ? 'Sending…' : 'Submit request'}</Button>
    </form>
  </div></dialog>;
}
