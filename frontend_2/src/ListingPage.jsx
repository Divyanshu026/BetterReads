import { appPath } from './services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Image as ImageIcon, X } from 'lucide-react';
import ListingForm from './components/ListingForm.jsx';
import Navbar from './components/Navbar.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';

export default function ListingPage() {
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
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="mx-auto max-w-[1280px] px-6 py-16 max-sm:px-4 max-sm:py-12">
        <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          <span>From one reader to another</span>
          <span className="h-px flex-1 bg-border" />
          <span>List a book</span>
        </div>
        <div className="mt-6 flex items-end justify-between gap-6 max-md:flex-col max-md:items-start">
          <div>
            <h1
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              className="text-[clamp(40px,6vw,68px)] leading-[0.95] font-extrabold tracking-tight uppercase"
            >
              Give a good<br />
              <span className="text-brand-red">book another chapter.</span>
            </h1>
            <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-muted-foreground max-sm:text-sm">
              Tell other readers about the book you would like to pass along. Add photos, a short note, and let your story find its next reader.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1.5"><Check className="size-3" /> Free to list</Badge>
            <Badge variant="outline" className="gap-1.5"><Check className="size-3" /> Up to 4 photos</Badge>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] items-start gap-6 max-md:grid-cols-1">
          <section aria-labelledby="listing-title">
            <Card>
              <CardHeader className="border-b [.border-b]:pb-4">
                <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Your book</span>
                <CardTitle id="listing-title" className="font-heading text-2xl font-semibold">
                  Tell us about it
                </CardTitle>
                <CardDescription>
                  A short, honest description helps readers decide.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ListingForm
                  photos={photos}
                  onBusyChange={setUploading}
                  onCreated={(data) => {
                    sessionStorage.setItem('betterreads.listingCreated', '1');
                    sessionStorage.setItem('betterreads.listingTitle', data?.book?.title || data?.title || 'Your book');
                    window.location.assign(appPath('/books'));
                  }}
                />
              </CardContent>
            </Card>
          </section>

          <aside aria-labelledby="listing-photos-title" className="flex flex-col gap-4">
            <Card>
              <CardHeader className="border-b [.border-b]:pb-4">
                <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Show your book</span>
                <CardTitle id="listing-photos-title" className="font-heading text-2xl font-semibold">
                  Photos from every angle.
                </CardTitle>
                <CardDescription>Add up to four. Cover, back, spine, and any signs of wear.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {photos.length === 0 ? (
                  <Empty className="gap-3 border border-dashed border-input p-6">
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><ImageIcon aria-hidden="true" /></EmptyMedia>
                      <EmptyTitle>Add your first photo</EmptyTitle>
                      <EmptyDescription>Make the cover your first photo so it leads the listing.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
                        <Camera data-icon="inline-start" /> Choose photos
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {photos.map((photo, index) => (
                      <div className="group/photo relative overflow-hidden rounded-lg ring-1 ring-border" key={photo.url}>
                        <img
                          className="aspect-square w-full object-cover"
                          src={photo.url}
                          alt={`Book photo ${index + 1}: ${photo.file.name}`}
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-background/80 px-2 py-1 text-xs font-medium backdrop-blur-sm">
                          {index === 0 ? 'Cover' : `Photo ${index + 1}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          aria-label={`Remove photo ${index + 1}`}
                          disabled={uploading}
                          className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-destructive hover:text-white disabled:opacity-50"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 4 && (
                      <button
                        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input text-muted-foreground transition-colors hover:border-ring hover:bg-muted disabled:opacity-50"
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Camera className="size-6" aria-hidden="true" />
                        <span className="text-sm font-medium">Add photos</span>
                      </button>
                    )}
                  </div>
                )}
                <input
                  ref={inputRef}
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={addPhotos}
                  disabled={uploading}
                  aria-label="Choose book photos"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{photos.length} of 4 photos</span>
                  <span>PNG, JPEG or WebP · up to 5 MB each</span>
                </div>
                {photoError && <p className="text-sm text-destructive" role="alert">{photoError}</p>}
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="flex flex-col gap-2 text-sm">
                <strong className="font-heading text-base font-semibold">Tips for a good listing</strong>
                <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-brand-red" /> Keep the cover photo clean and well-lit.</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-brand-red" /> Mention any marks, highlights, or wear.</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-brand-red" /> Tell readers what you would like in return.</li>
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
