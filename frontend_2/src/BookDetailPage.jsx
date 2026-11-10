import { appPath } from './services/paths.js';
import { useEffect, useState } from 'react';
import { MessageCircle, Repeat } from 'lucide-react';
import WishlistButton from './components/WishlistButton.jsx';
import ExchangeRequestModal from './components/ExchangeRequestModal.jsx';
import Navbar from './components/Navbar.jsx';
import AccountPanel from './components/AccountPanel.jsx';
import { getToken } from './services/auth.js';
import { exampleBooks } from './exampleBooks.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const photoUrl = (url) => url.startsWith('/uploads/') ? apiBase + url : url.startsWith('/covers/') ? appPath(url) : url;

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
  const [showRequest, setShowRequest] = useState(false);
  const [requestExplanation, setRequestExplanation] = useState(false);
  const [requestNotice, setRequestNotice] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [requestStatus, setRequestStatus] = useState('');

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


  useEffect(() => {
    let active = true;
    if (!user || !id) { setRequestStatus(''); return () => { active = false; }; }
    request(`/api/offers?listingId=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((offers) => { if (active) { const mine = offers.find((offer) => String(offer.proposerId?._id || offer.proposerId) === String(user.id)); setRequestStatus(mine?.status || ''); } })
      .catch(() => {});
    return () => { active = false; };
  }, [id, user]);

  async function openChat() {
    if (!user) { setShowAccount(true); return; }
    if (!book?.ownerId?._id || String(book.ownerId._id) === String(user.id) || chatBusy) return;
    setChatBusy(true); setChatError('');
    try {
      const chat = await request('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ participantId: book.ownerId._id }) });
      window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { chatId: chat._id, bookId: book._id } })); setChatBusy(false);
    } catch (err) { setChatError(err.message); setChatBusy(false); }
  }

  const key = book?.example ? book.title : book?._id;
  const images = book ? (book.photos?.length ? book.photos.map(photoUrl) : [appPath('/covers/placeholder.svg')]) : [];
  const ownerId = book?.ownerId?._id;
  const isOwner = user && ownerId && String(user.id) === String(ownerId);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="mx-auto max-w-[1080px] px-6 py-8 max-sm:px-4 max-sm:py-6">
        {loading ? <p role="status" className="py-14 text-muted-foreground">Loading book details…</p> : error ? <p role="alert" className="py-14 text-muted-foreground">{error}</p> : book && (
          <div className="grid grid-cols-[minmax(0,420px)_minmax(0,1fr)] items-start gap-8 max-md:grid-cols-1 max-md:gap-6">
            <section aria-label="Book photos" className="flex flex-col gap-3 max-md:max-w-sm">
              <div className="overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10"><img key={images[photoIndex]} className="aspect-[3/4] w-full object-cover" src={images[photoIndex]} alt={`${book.title}, photo ${photoIndex + 1} of ${images.length}`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = book.coverFallback || appPath('/covers/placeholder.svg'); }} /></div>
              {images.length > 1 && <div className="flex flex-wrap gap-2">{images.map((src, index) => <button key={`${src}-${index}`} type="button" className={cn('size-16 overflow-hidden rounded-lg ring-1 transition-all', photoIndex === index ? 'ring-2 ring-ring' : 'ring-border hover:ring-foreground/30')} aria-label={`Show photo ${index + 1}`} aria-pressed={photoIndex === index} onClick={() => setPhotoIndex(index)}><img className="size-full object-cover" src={src} alt="" /></button>)}</div>}
            </section>
            <section className="flex flex-col gap-4">
              <div>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{book.example ? 'Example book' : 'Reader listing'}</span>
                <h1 className="font-heading text-3xl font-bold tracking-tight break-words">{book.title}</h1>
                <p className="mt-1 text-base text-muted-foreground">by {book.author || 'Unknown author'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {book.example ? <Badge variant="secondary">Example book</Badge> : <>
                  {book.barterAvailable && <Badge variant="secondary"><Repeat className="mr-1 size-3" /> Open to exchange</Badge>}
                  {book.borrowAvailable && <Badge variant="secondary">Available to borrow</Badge>}
                  {!book.barterAvailable && !book.borrowAvailable && <Badge variant="outline">Contact reader</Badge>}
                </>}
              </div>
              <Card><CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
                  <div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Listed by</dt><dd className="mt-0.5 text-sm">{book.example ? 'Example listing' : ownerId ? <a className="font-medium hover:underline" href={appPath(`/readers/${ownerId}`)}>{book.ownerId?.name || 'Reader'}</a> : 'Reader'}</dd></div>
                  <div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Condition</dt><dd className="mt-0.5 text-sm">{book.example ? book.state : book.condition}</dd></div>
                  <div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Location</dt><dd className="mt-0.5 text-sm">{book.location?.city || 'Not provided'}</dd></div>
                  {book.genre && <div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Genre</dt><dd className="mt-0.5 text-sm">{book.genre}</dd></div>}
                  {!book.example && <><div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Availability</dt><dd className="mt-0.5 text-sm capitalize">{book.status}</dd></div><div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Exchange</dt><dd className="mt-0.5 text-sm">{book.barterAvailable ? 'Available' : 'Not offered'}</dd></div><div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Borrowing</dt><dd className="mt-0.5 text-sm">{book.borrowAvailable ? 'Available' : 'Not offered'}</dd></div><div><dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Listed</dt><dd className="mt-0.5 text-sm">{book.createdAt ? new Date(book.createdAt).toLocaleDateString() : 'Not provided'}</dd></div></>}
                </dl>
              </CardContent></Card>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{book.example ? book.note : book.description || 'No description provided.'}</p>
              {book.example && <p className="text-sm text-muted-foreground">This is an example book and is not available for purchase or chat.</p>}
              {!book.example && book.status !== 'available' && <p className="text-sm text-muted-foreground">This book is currently {book.status}.</p>}
              <Separator />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" disabled={book.example || book.status !== 'available' || !ownerId || isOwner || requestStatus === 'pending' || requestStatus === 'accepted'} onClick={() => { if (!book.barterAvailable && !book.borrowAvailable) { setRequestExplanation(true); return; } setRequestExplanation(false); if (user) setShowRequest(true); else setShowAccount(true); }}><Repeat data-icon="inline-start" />{isOwner ? 'Your listing' : requestStatus === 'pending' ? 'Request pending' : requestStatus === 'accepted' ? 'Request accepted' : 'Ask for exchange or borrow'}</Button>
                <WishlistButton bookId={key} example={book.example} onSignIn={() => setShowAccount(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted aria-pressed:text-destructive disabled:opacity-50" />
                {!book.example && <Button type="button" variant="outline" disabled={!ownerId || isOwner || chatBusy} onClick={openChat}><MessageCircle data-icon="inline-start" />{isOwner ? 'Your listing' : chatBusy ? 'Opening…' : 'Message lister'}</Button>}
              </div>
              {requestExplanation && <p className="text-sm text-muted-foreground" role="status">The owner has not offered this book for exchange or borrowing yet. <button type="button" className="font-medium text-foreground hover:underline" onClick={openChat}>Message the lister</button> to ask about it.</p>}
              {!user && <p className="text-sm text-muted-foreground">Sign in to save books and exchange requests to your account.</p>}
              {requestNotice && <div role="status" className="rounded-lg border border-border bg-muted px-4 py-3 text-sm">{requestNotice} <button type="button" className="font-medium hover:underline" onClick={() => window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'requests' } }))}>View requests</button></div>}
              {showRequest && <ExchangeRequestModal book={book} user={user} onClose={() => setShowRequest(false)} onCreated={(_offer, warning) => { setShowRequest(false); setRequestStatus('pending'); setRequestNotice(warning || 'Request sent.'); }} />}
              {showAccount && <Card aria-label="Log in or sign up"><CardContent><h2 className="font-heading text-lg font-medium">Log in to message</h2><p className="mt-1 text-sm text-muted-foreground">After signing in, choose an action to continue.</p><div className="mt-3"><AccountPanel onAuthenticated={() => { setShowAccount(false); setAuthVersion((n) => n + 1); }} /></div><Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setShowAccount(false)}>Close</Button></CardContent></Card>}
              {chatError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{chatError}</div>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}








