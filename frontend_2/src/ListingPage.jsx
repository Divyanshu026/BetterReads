import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, X } from 'lucide-react';
import AccountPanel from './components/AccountPanel.jsx';
import ListingForm from './components/ListingForm.jsx';
import InboxLink from './components/InboxLink.jsx';

export default function ListingPage() {
  const [signingIn, setSigningIn] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [uploading, setUploading] = useState(false);
  const photosRef = useRef([]);
  const inputRef = useRef(null);

  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);

  function addPhotos(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (photosRef.current.length + files.length > 4) {
      setPhotoError('You can add up to four photos.');
      return;
    }
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) {
      setPhotoError('Choose PNG, JPEG or WebP images up to 5 MB each.');
      return;
    }
    const added = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    photosRef.current = [...photosRef.current, ...added];
    setPhotos(photosRef.current);
    setPhotoError('');
  }

  function removePhoto(index) {
    URL.revokeObjectURL(photosRef.current[index].url);
    photosRef.current = photosRef.current.filter((_, i) => i !== index);
    setPhotos(photosRef.current);
    setPhotoError('');
  }

  return (
    <div className="listing-page">
      <header className="listing-page-header">
        <a className="brand" href="/" aria-label="BetterReads home">
          <img className="brand-icon" src="/betterreads-reader.png" alt="" />
          <span className="brand-name">BETTERREADS<small>BOOKS · NEW BEGINNINGS</small></span>
        </a>
        <div className="subpage-nav"><InboxLink /><a className="listing-back" href="/books"><ArrowLeft size={17} aria-hidden="true" /> Back to books</a></div>
      </header>
      <main className="listing-page-main">
        <div className="listing-page-intro">
          <span className="eyebrow">FROM ONE READER TO ANOTHER</span>
          <h1>Give a good book <em>another chapter.</em></h1>
          <p>Tell other readers about the book you would like to pass along.</p>
        </div>
        <section className="listing-page-form" aria-labelledby="listing-title">
          <span className="eyebrow">YOUR BOOK</span>
          <h2 id="listing-title">{signingIn ? 'Your account' : 'List a book'}</h2>
          {signingIn ? (
            <>
              <AccountPanel onAuthenticated={() => setSigningIn(false)} />
              <button className="listing-return" type="button" onClick={() => setSigningIn(false)}>Back to listing</button>
            </>
          ) : (
            <ListingForm photos={photos} onBusyChange={setUploading} onSignIn={() => setSigningIn(true)} onCreated={() => {
              sessionStorage.setItem('betterreads.listingCreated', '1');
              window.location.assign('/books');
            }} />
          )}
        </section>
        <aside className="listing-photos" aria-labelledby="listing-photos-title">
          <span className="eyebrow">SHOW YOUR BOOK</span>
          <h2 id="listing-photos-title">Photos from every angle.</h2>
          <p>Add up to four photos. Show the cover, back, spine, and any signs of wear.</p>
          <div className="listing-photo-grid">
            {photos.map((photo, index) => (
              <div className="listing-photo" key={photo.url}>
                <img src={photo.url} alt={`Book photo ${index + 1}: ${photo.file.name}`} />
                <span>{index === 0 ? 'Cover' : `Photo ${index + 1}`}</span>
                <button type="button" onClick={() => removePhoto(index)} aria-label={`Remove photo ${index + 1}`} disabled={uploading}><X size={16} /></button>
              </div>
            ))}
            {photos.length < 4 && (
              <button className="listing-photo-add" type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
                <Camera size={25} aria-hidden="true" /> <span>Add photos</span>
              </button>
            )}
          </div>
          <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} disabled={uploading} aria-label="Choose book photos" />
          <p className="listing-photo-help">{photos.length} of 4 photos · PNG, JPEG or WebP · up to 5 MB each. The first photo is the cover.</p>
          {photoError && <p className="account-error" role="alert">{photoError}</p>}
        </aside>
      </main>
    </div>
  );
}



