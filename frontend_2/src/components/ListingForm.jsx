import { useState } from 'react';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const tokenKey = 'betterreads.authToken';

export default function ListingForm({ photos, onBusyChange, onCreated, onSignIn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const form = new FormData(event.currentTarget);
    if (!photos.length) { setError('Add at least one book photo.'); return; }
    const payload = {
      title: String(form.get('title')).trim(),
      author: String(form.get('author')).trim(),
      genre: String(form.get('genre')).trim(),
      condition: String(form.get('condition')),
      description: [String(form.get('description')).trim(), String(form.get('interests')).trim() && 'Interested in: ' + String(form.get('interests')).trim()].filter(Boolean).join('\n\n'),
      city: String(form.get('city')).trim(),
      priceCents: 0,
      photos: [],
      barterAvailable: form.has('barter'),
    };
    if (!payload.title) { setError('Enter a book title.'); return; }
    setBusy(true);
    onBusyChange(true);
    const uploaded = [];
    let listingRequestStarted = false;
    let listingRejected = false;
    try {
      for (const photo of photos) {
        const image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Unable to read a photo. Please select it again.'));
          reader.readAsDataURL(photo.file);
        });
        const upload = await fetch(`${apiBase}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image }),
        });
        if (upload.status === 401) {
          setSessionExpired(true);
          throw new Error('Your session has expired. Please log in again.');
        }
        if (!upload.ok || !(upload.headers.get('content-type') || '').includes('application/json')) {
          throw new Error('Unable to upload your photo. Please try again.');
        }
        const result = await upload.json();
        if (!result.url || !result.publicId) throw new Error('Unable to upload your photo. Please try again.');
        uploaded.push(result);
      }
      payload.photos = uploaded.map((image) => image.url);
      listingRequestStarted = true;
      const response = await fetch(`${apiBase}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) listingRejected = true;
      const type = response.headers.get('content-type') || '';
      if (!type.includes('application/json')) throw new Error('The listing server is unavailable. Check the backend and restart the frontend server.');
      const data = await response.json();
      if (response.status === 401) {
        setSessionExpired(true);
        throw new Error('Your session has expired. Please log in again.');
      }
      if (!response.ok) throw new Error(data.error?.message || 'Unable to list your book. Please try again.');
      onCreated(data);
    } catch (err) {
      if (!listingRequestStarted || listingRejected) {
        await Promise.allSettled(uploaded.map((image) => fetch(`${apiBase}/api/upload/${encodeURIComponent(image.publicId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })));
      }
      setError(err instanceof TypeError ? 'Unable to connect to the listing server. Please try again.' : err.message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  if (!token) return <div className="listing-form"><p>Log in or create an account to list a book.</p><button type="button" className="button button-red" onClick={onSignIn}>Log in or sign up</button></div>;
  return (
    <form className="account-form listing-form" onSubmit={submit}>
      <p>Share the details of the book you would like to pass along.</p>
      <label>Book title<input name="title" maxLength={200} required /></label>
      <label>Author<input name="author" maxLength={100} required /></label>
      <div className="listing-row">
        <label>Condition<select name="condition" defaultValue="Used"><option>New</option><option>Like New</option><option>Used</option></select></label>
        <label>City or area<input name="city" maxLength={100} required /></label>
      </div>
      <label>Genre<input name="genre" maxLength={100} required /></label>
      <label>Description<textarea name="description" maxLength={2700} rows={3} required /></label>
      <label className="account-remember"><input name="barter" type="checkbox" defaultChecked /> Available for exchange</label>
      <label>Books you would like in return (optional)<input name="interests" maxLength={250} /></label>
      <p className="detail-note">Borrowing and meetup availability are not supported yet. You can discuss arrangements in chat.</p>
      {error && <p className="account-error" role="alert">{error}</p>}
      {sessionExpired && <button type="button" className="text-link" onClick={onSignIn}>Log in again</button>}
      <button className="button button-red account-submit" type="submit" disabled={busy}>{busy ? 'Listing book…' : 'List book'}</button>
    </form>
  );
}

