import { useState } from 'react';
import { getToken } from '../services/auth.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function ListingForm({ photos, onBusyChange, onCreated, onSignIn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const token = getToken();

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
      borrowAvailable: form.has('borrow'),
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

  if (!token) return <div className="flex flex-col items-start gap-3"><p className="text-sm text-muted-foreground">Log in or create an account to list a book.</p><Button type="button" onClick={onSignIn}>Log in or sign up</Button></div>;
  return (
    <form onSubmit={submit}>
      <p className="mb-4 text-sm text-muted-foreground">Share the details of the book you would like to pass along.</p>
      <FieldGroup>
        <Field><FieldLabel htmlFor="lf-title">Book title</FieldLabel><Input id="lf-title" name="title" maxLength={200} required /></Field>
        <Field><FieldLabel htmlFor="lf-author">Author</FieldLabel><Input id="lf-author" name="author" maxLength={100} required /></Field>
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field><FieldLabel htmlFor="lf-condition">Condition</FieldLabel><Select name="condition" defaultValue="Used"><SelectTrigger id="lf-condition" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="New">New</SelectItem><SelectItem value="Like New">Like New</SelectItem><SelectItem value="Used">Used</SelectItem></SelectGroup></SelectContent></Select></Field>
          <Field><FieldLabel htmlFor="lf-city">City or area</FieldLabel><Input id="lf-city" name="city" maxLength={100} required /></Field>
        </div>
        <Field><FieldLabel htmlFor="lf-genre">Genre</FieldLabel><Input id="lf-genre" name="genre" maxLength={100} required /></Field>
        <Field><FieldLabel htmlFor="lf-description">Description</FieldLabel><Textarea id="lf-description" name="description" maxLength={2700} rows={3} required /></Field>
        <Field orientation="horizontal"><input id="lf-barter" name="barter" type="checkbox" defaultChecked className="size-4 accent-primary" /><FieldLabel htmlFor="lf-barter" className="font-normal">Available for exchange</FieldLabel></Field>
        <Field><FieldLabel htmlFor="lf-interests">Books you would like in return (optional)</FieldLabel><Input id="lf-interests" name="interests" maxLength={250} /></Field>
        <Field orientation="horizontal"><input id="lf-borrow" type="checkbox" name="borrow" className="size-4 accent-primary" /><FieldLabel htmlFor="lf-borrow" className="font-normal">Available to borrow</FieldLabel></Field>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        {sessionExpired && <Button type="button" variant="link" className="self-start px-0" onClick={onSignIn}>Log in again</Button>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Listing book…' : 'List book'}</Button>
      </FieldGroup>
    </form>
  );
}

