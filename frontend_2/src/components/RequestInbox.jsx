import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

export default function RequestInbox({ user, onUpdate }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function load() {
    try {
      const data = await api('/api/offers');
      const enriched = await Promise.all(data.map(async (offer) => {
        if (!offer.listingId?._id || String(offer.listingId.ownerId) === String(user.id)) return offer;
        try { const book = await api(`/api/books/${encodeURIComponent(offer.listingId._id)}`); return { ...offer, ownerName: book.ownerId?.name }; }
        catch { return offer; }
      }));
      setOffers(enriched); setError('');
    }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function update(id, action) {
    setBusy(id); setError(''); setNotice('');
    try {
      await api(`/api/offers/${encodeURIComponent(id)}`, action === 'cancelled' ? { method: 'DELETE' } : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: action }) });
      setOffers((items) => items.map((offer) => offer._id === id ? { ...offer, status: action } : offer));
      setNotice(`Request ${action}.`);
      await load();
      window.dispatchEvent(new Event('betterreads:inbox-change'));
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  }
  const incoming = offers.filter((offer) => String(offer.listingId?.ownerId) === String(user.id));
  const outgoing = offers.filter((offer) => String(offer.proposerId?._id || offer.proposerId) === String(user.id));
  function group(title, list, isIncoming) {
    return <section className="request-group"><h3>{title}</h3>{!loading && !list.length && <p>No {title.toLowerCase()} requests.</p>}{list.map((offer) => <article className="request-item" key={offer._id}><div><a href={offer.listingId?._id ? `/books/${offer.listingId._id}` : '/books'}><strong>{offer.listingId?.title || 'Unavailable book'}</strong></a><p>{isIncoming ? `Requested by ${offer.proposerId?.name || 'Reader'} · Your book` : `Requested by you · ${offer.ownerName ? offer.ownerName + '’s book' : 'Reader’s book'}`}</p><p>{offer.type === 'barter' ? 'Exchange' : 'Purchase'} · Offered: {offer.offeredBookIds?.map((book) => book.title).join(', ') || 'None'}</p><span className="request-status">{offer.status}</span></div>{offer.status === 'pending' && <div className="request-actions">{isIncoming ? <><button className="button button-red" disabled={!!busy} onClick={() => update(offer._id, 'accepted')}>Accept exchange</button><button className="detail-secondary" disabled={!!busy} onClick={() => update(offer._id, 'declined')}>Decline</button><small>Accepting immediately marks both books exchanged.</small></> : <button className="detail-secondary" disabled={!!busy} onClick={() => update(offer._id, 'cancelled')}>Cancel request</button>}</div>}</article>)}</section>;
  }
  return <div className="requests-content">{loading && <p role="status">Loading requests…</p>}{notice && <p className="catalog-notice" role="status">{notice}</p>}{error && <p role="alert" className="account-error">{error}</p>}{group('Incoming', incoming, true)}{group('Sent', outgoing, false)}</div>;
}

