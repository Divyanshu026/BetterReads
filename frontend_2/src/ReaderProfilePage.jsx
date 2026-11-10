import { appPath } from './services/paths.js';
import { useEffect, useState } from 'react';
import { BookOpen, Calendar, MapPin, Pencil, Plus, Repeat, Star, Heart, MessageCircle, UserPlus, UserCheck } from 'lucide-react';
import PageShell from './components/PageShell.jsx';
import AccountPanel from './components/AccountPanel.jsx';
import AuthLayout from './components/AuthLayout.jsx';
import BookCard from './components/BookCard.jsx';
import useReader from './services/useReader.js';
import { api, getAllBooks, localGet, localSet, photoUrl } from './services/api.js';
import { exampleBooks } from './exampleBooks.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { FieldGroup, Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const toCard = (book) => ({ id: book._id, title: book.title, author: book.author, genre: book.genre, barterAvailable: book.barterAvailable, borrowAvailable: book.borrowAvailable, state: book.condition, location: book.location?.city, cover: book.photos?.[0] ? photoUrl(book.photos[0]) : appPath('/covers/placeholder.svg'), coverFallback: appPath('/covers/placeholder.svg') });
const readImage = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read this photo.')); reader.readAsDataURL(file); });
const memberSince = (iso) => { if (!iso) return ''; const date = new Date(iso); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); };

export default function ReaderProfilePage({ readerId, mine = false }) {
  const { user, loading: authLoading, error: authError, refresh } = useReader();
  const [profile, setProfile] = useState(null); const [books, setBooks] = useState([]); const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true); const [wishlistLoading, setWishlistLoading] = useState(false); const [wishlistError, setWishlistError] = useState('');
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'books'); const [offerCount, setOfferCount] = useState(null);
  const [editing, setEditing] = useState(() => new URLSearchParams(window.location.search).get('edit') === '1'); const [editBook, setEditBook] = useState(null); const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null); const [avatarPreview, setAvatarPreview] = useState('');
  const [messaging, setMessaging] = useState(false); const [showAccount, setShowAccount] = useState(false);
  const [localVersion, setLocalVersion] = useState(0); const [communityPosts, setCommunityPosts] = useState([]); const [communityError, setCommunityError] = useState('');
  const id = mine ? user?.id : readerId; const isMine = Boolean(user && String(user.id) === String(id));
  const usernameKey = `betterreads.username.${id || ''}`; const followsKey = `betterreads.following.${user?.id || ''}`;
  const username = isMine ? localGet(usernameKey, '') : '';
  const following = Boolean(user && localGet(followsKey, []).includes(id));
  const activity = communityPosts.map((post) => ({ id: post._id, type: 'Discussion', text: post.title, date: post.createdAt }));
  const visibleBooks = isMine ? books : books.filter((book) => ['available', 'reserved', 'borrowed'].includes(book.status));
  const publicPosts = communityPosts;
  const examples = exampleBooks.filter((book) => localGet('betterreads.wishlist', []).includes(book.title));
  async function loadBooks() { if (id) setBooks(await getAllBooks(`&sellerId=${encodeURIComponent(id)}`)); }
  useEffect(() => { let active = true; if (!id) { setLoading(false); return () => { active = false; }; } setLoading(true); setProfile(null); setError(''); Promise.all([api(`/api/users/${encodeURIComponent(id)}`), getAllBooks(`&sellerId=${encodeURIComponent(id)}`)]).then(([data, list]) => { if (active) { setProfile(data.user); setBooks(list); } }).catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);
  useEffect(() => { if (!id || !['activity', 'posts'].includes(tab)) return undefined; let active = true; setCommunityError(''); api(`/api/community/posts?author=${encodeURIComponent(id)}`).then((data) => { if (active) setCommunityPosts(data.posts || []); }).catch((err) => { if (active) setCommunityError(err.message); }); return () => { active = false; }; }, [id, tab]);
  useEffect(() => { if (!isMine) return undefined; let active = true; setWishlistLoading(true); setWishlistError(''); api('/api/wishlist').then((data) => { if (active) setWishlist(data.wishlist || []); }).catch((err) => { if (active) setWishlistError(err.message); }).finally(() => { if (active) setWishlistLoading(false); }); return () => { active = false; }; }, [isMine, localVersion]);
  useEffect(() => { if (!isMine) { setOfferCount(null); return undefined; } let active = true; api('/api/offers').then((offers) => { if (active) setOfferCount({ count: offers.filter((offer) => offer.type === 'barter' && offer.status === 'accepted').length, limited: offers.length >= 100 }); }).catch(() => { if (active) setOfferCount(null); }); return () => { active = false; }; }, [isMine]);
  useEffect(() => { function syncTab() { setTab(new URLSearchParams(window.location.search).get('tab') || 'books'); } window.addEventListener('popstate', syncTab); return () => window.removeEventListener('popstate', syncTab); }, []);
  function chooseTab(value) { setTab(value); const url = new URL(window.location.href); if (value === 'books') url.searchParams.delete('tab'); else url.searchParams.set('tab', value); window.history.pushState({}, '', url); }
  useEffect(() => { const update = () => setLocalVersion((value) => value + 1); window.addEventListener('betterreads:local-change', update); return () => window.removeEventListener('betterreads:local-change', update); }, []);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);
  async function messageReader() { if (!user) { setShowAccount(true); return; } setMessaging(true); setError(''); try { const chat = await api('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantId: id }) }); window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { chatId: chat._id } })); setMessaging(false); } catch (err) { setError(err.message); setMessaging(false); } }
  function toggleFollow() { if (!user) { setShowAccount(true); return; } const list = localGet(followsKey, []); localSet(followsKey, following ? list.filter((value) => value !== id) : [...list, id]); }
  function selectAvatar(event) { const file = event.target.files?.[0]; setError(''); if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) { setError('Choose a JPEG, PNG, or WebP image up to 5 MB.'); event.target.value = ''; return; } setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  async function saveProfile(event) { event.preventDefault(); if (saving) return; const form = new FormData(event.currentTarget); const name = String(form.get('name')).trim(); const handle = String(form.get('username')).trim().replace(/^@/, ''); if (!name || (handle && !/^[a-zA-Z0-9_.]{3,30}$/.test(handle))) { setError('Enter a name and a username of 3–30 letters, numbers, dots or underscores.'); return; } setSaving(true); setError(''); try { let avatarUrl = profile.avatarUrl || ''; if (avatarFile) { const upload = await api('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: await readImage(avatarFile) }) }); if (!upload.url) throw new Error('Unable to upload your avatar.'); avatarUrl = upload.url; } const data = await api(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, bio: String(form.get('bio')).trim(), city: String(form.get('city')).trim(), genres: String(form.get('genres')).split(',').map((g) => g.trim()).filter(Boolean), avatarUrl }) }); setProfile(data.user); window.dispatchEvent(new Event('betterreads:profile-change')); localSet(usernameKey, handle); setAvatarFile(null); setAvatarPreview(''); setEditing(false); setNotice('Profile updated.'); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  async function saveBook(event) { event.preventDefault(); const form = new FormData(event.currentTarget); try { await api(`/api/books/${encodeURIComponent(editBook._id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: String(form.get('title')).trim(), author: String(form.get('author')).trim(), genre: String(form.get('genre')).trim(), condition: form.get('condition'), city: String(form.get('city')).trim(), description: String(form.get('description')).trim(), barterAvailable: form.has('barter'), borrowAvailable: form.has('borrow') }) }); setEditBook(null); await loadBooks(); setNotice('Listing updated.'); } catch (err) { setError(err.message); } }
  async function deleteBook(book) { if (!window.confirm(`Delete “${book.title}”?`)) return; try { await api(`/api/books/${encodeURIComponent(book._id)}`, { method: 'DELETE' }); await loadBooks(); setNotice('Listing deleted.'); } catch (err) { setError(err.message); } }
  const tabs = isMine ? [['books', 'Bookshelf'], ['activity', 'Activity'], ['about', 'About']] : [['books', 'Bookshelf'], ['posts', 'Community posts'], ['about', 'About']];
  const currentTab = tabs.some(([key]) => key === tab) ? tab : 'books';

  const savedCount = wishlistLoading || wishlistError ? null : wishlist.length + examples.length;
  const rating = profile?.reputation?.score; const reviews = profile?.reputation?.reviewsCount || 0;
  const joined = memberSince(profile?.createdAt);
  const stats = [
    { key: 'books', icon: <BookOpen size={18} aria-hidden="true" />, value: visibleBooks.length, label: isMine ? 'Books listed' : 'Public listings' },
    ...(isMine ? [
      { key: 'exchanges', icon: <Repeat size={18} aria-hidden="true" />, value: offerCount ? `${offerCount.count}${offerCount.limited ? '+' : ''}` : '—', label: 'Exchanges' },
      { key: 'saved', icon: <Heart size={18} aria-hidden="true" />, value: savedCount === null ? '—' : savedCount, label: 'Saved' },
    ] : []),
    { key: 'rating', icon: <Star size={18} aria-hidden="true" />, value: reviews ? Number(rating).toFixed(1) : '—', label: reviews ? `${reviews} review${reviews === 1 ? '' : 's'}` : 'No reviews yet' },
  ];

  return <PageShell><div className="min-h-[calc(100vh-72px)] bg-background text-foreground font-sans">
    <main className="mx-auto max-w-[1040px] px-6 py-8 max-sm:px-4 max-sm:py-6">
      {authLoading || (id && loading) ? <div role="status" className="py-14 text-muted-foreground">Loading reader profile…</div>
        : mine && authError && !user ? <div role="alert" className="flex flex-col items-start gap-3 py-14"><p className="text-muted-foreground">{authError}</p><Button variant="outline" onClick={refresh}>Try again</Button></div>
        : mine && !user ? <div className="py-6"><AuthLayout><AccountPanel onAuthenticated={refresh} /></AuthLayout></div>
        : !profile ? <div role="alert" className="flex flex-col items-start gap-3 py-14"><p className="text-muted-foreground">{error || 'Reader not found.'}</p><Button asChild variant="outline"><a href={appPath('/books')}>Back to books</a></Button></div>
        : <>

      <Card className="pt-0">
        <div aria-hidden="true" className="h-28 bg-gradient-to-br from-primary/90 to-primary max-sm:h-20" />
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
            <div className="flex items-end gap-4 max-sm:items-center">
              <Avatar className="-mt-12 size-24 ring-4 ring-card max-sm:-mt-10 max-sm:size-20">
                <AvatarImage src={profile.avatarUrl ? photoUrl(profile.avatarUrl) : undefined} alt="" />
                <AvatarFallback className="text-3xl">{(profile.name || 'R').slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 pb-1">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{isMine ? 'Your reading life' : 'Reader profile'}</span>
                <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight break-words">{profile.name || 'Reader'}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {username && <span className="font-medium text-foreground">@{username}</span>}
                  <span className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {profile.city || 'Location not provided'}</span>
                  {joined && <span className="flex items-center gap-1.5"><Calendar className="size-3.5" /> Joined {joined}</span>}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 pb-1">
              {isMine
                ? <Button variant="outline" onClick={() => { setEditing(!editing); setError(''); }}><Pencil data-icon="inline-start" /> Edit profile</Button>
                : <>
                    <Button disabled={messaging} onClick={messageReader}><MessageCircle data-icon="inline-start" /> {messaging ? 'Opening…' : 'Message'}</Button>
                    <Button variant="outline" aria-pressed={following} onClick={toggleFollow}>{following ? <><UserCheck data-icon="inline-start" /> Following</> : <><UserPlus data-icon="inline-start" /> Follow</>}</Button>
                  </>}
            </div>
          </div>
          <p className="max-w-[70ch] text-sm leading-relaxed text-foreground/90">{profile.bio || (isMine ? 'Tell readers a little about yourself — add a bio from Edit profile.' : 'This reader has not added a bio yet.')}</p>
          {(profile.genres || []).length > 0 && <div className="flex flex-wrap gap-1.5">{profile.genres.map((genre) => <Badge key={genre} variant="secondary">{genre}</Badge>)}</div>}
          <Separator />
          <dl className="flex flex-wrap gap-x-8 gap-y-3" aria-label="Reading overview">
            {stats.map((stat) => <div className="flex flex-col gap-0.5" key={stat.key}>
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{stat.label}</dt>
              <dd className="flex items-center gap-1.5 font-heading text-xl font-bold [&_svg]:size-[18px] [&_svg]:text-muted-foreground">{stat.icon}{stat.value}</dd>
            </div>)}
          </dl>
          {!isMine && <small className="text-xs text-muted-foreground">Following is saved in this browser.</small>}
        </CardContent>
      </Card>

      {notice && <div role="status" className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm">{notice}</div>}
      {error && <div role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {isMine && profile && (
        <Dialog
          open={editing}
          onOpenChange={(open) => { setEditing(open); if (!open) { setAvatarFile(null); setAvatarPreview(''); setError(''); } }}
        >
          <DialogContent className="flex max-h-[90dvh] w-full flex-col gap-0 p-0 sm:max-w-2xl">
            <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-border px-6 py-4">
              <DialogTitle className="font-heading text-xl font-semibold">Edit profile</DialogTitle>
              <DialogDescription className="sr-only">Update how other readers see you on BetterReads.</DialogDescription>
            </DialogHeader>
            <form onSubmit={saveProfile} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <FieldGroup className="gap-6">
                  <Field orientation="horizontal" className="items-center">
                    <Avatar className="size-20 ring-2 ring-border">
                      <AvatarImage src={avatarPreview || (profile.avatarUrl ? photoUrl(profile.avatarUrl) : undefined)} alt="" />
                      <AvatarFallback className="text-2xl">{(profile.name || 'R').slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <FieldLabel htmlFor="pf-photo" className="text-sm font-medium">Profile photo</FieldLabel>
                      <Input id="pf-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} className="file:text-xs" />
                      <FieldDescription>JPEG, PNG, or WebP up to 5 MB.</FieldDescription>
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                    <Field>
                      <FieldLabel htmlFor="pf-name">Display name</FieldLabel>
                      <Input id="pf-name" name="name" defaultValue={profile.name} required maxLength={100} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="pf-username">Username</FieldLabel>
                      <Input id="pf-username" name="username" defaultValue={username} maxLength={30} autoComplete="off" placeholder="your-handle" />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="pf-bio">Bio</FieldLabel>
                    <Textarea id="pf-bio" name="bio" defaultValue={profile.bio} maxLength={1000} rows={4} placeholder="Share what you love to read…" />
                    <FieldDescription>Up to 1000 characters.</FieldDescription>
                  </Field>
                  <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                    <Field>
                      <FieldLabel htmlFor="pf-city">City</FieldLabel>
                      <Input id="pf-city" name="city" defaultValue={profile.city} maxLength={100} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="pf-genres">Favorite genres</FieldLabel>
                      <Input id="pf-genres" name="genres" defaultValue={(profile.genres || []).join(', ')} placeholder="Fantasy, Mystery" />
                      <FieldDescription>Separate each genre with a comma.</FieldDescription>
                    </Field>
                  </div>
                  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                </FieldGroup>
              </div>
              <DialogFooter className="-mx-0 -mb-0 mt-0 flex flex-row items-center justify-end gap-2 border-t bg-muted/50 px-6 py-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => { setEditing(false); setAvatarFile(null); setAvatarPreview(''); }}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {showAccount && <Card className="mt-4"><CardContent><h2 className="mb-4 font-heading text-lg font-medium">Log in to connect</h2><AccountPanel onAuthenticated={() => { setShowAccount(false); refresh(); }} /><Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAccount(false)}>Close</Button></CardContent></Card>}

      <Tabs value={currentTab} onValueChange={chooseTab} className="mt-7">
        <TabsList aria-label="Profile sections">{tabs.map(([key, label]) => <TabsTrigger key={key} value={key}>{label}</TabsTrigger>)}</TabsList>
      </Tabs>

      <div className="mt-6">
        {currentTab === 'books' && <section aria-label={isMine ? 'My books' : 'Reader books'}>
          <div className="mb-5 flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
            <div><span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{isMine ? 'Your shelf, your stories' : 'On their shelf'}</span><h2 className="font-heading text-2xl font-bold tracking-tight">{isMine ? 'My bookshelf' : 'Listed books'}</h2></div>
            {isMine && <Button asChild><a href={appPath('/list-book')}><Plus data-icon="inline-start" /> List a book</a></Button>}
          </div>
          {!visibleBooks.length
            ? (isMine
                ? <Card><CardContent className="flex items-center gap-4 py-6 max-sm:flex-col max-sm:text-center"><div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><BookOpen className="size-6" /></div><div className="flex-1"><h3 className="font-heading text-lg font-medium">Your shelf is waiting.</h3><p className="text-sm text-muted-foreground">You haven't listed any books yet. Share your first book with the BetterReads community!</p></div><Button asChild variant="outline"><a href={appPath('/list-book')}><Plus data-icon="inline-start" /> List your first book</a></Button></CardContent></Card>
                : <p className="py-4 text-sm text-muted-foreground">No books are listed right now.</p>)
            : <div className="catalog-grid">{visibleBooks.map((book, index) => <div className="profile-listing" key={book._id}><BookCard index={index} book={toCard(book)} /><div className="mt-2.5 flex items-center gap-2 border-t border-border pt-2.5"><Badge variant="outline" className="mr-auto capitalize">{book.status || 'available'}</Badge>{isMine && book.status === 'available' && <><Button variant="ghost" size="sm" onClick={() => setEditBook(book)}>Edit</Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteBook(book)}>Delete</Button></>}</div></div>)}</div>}
        </section>}

        {isMine && currentTab === 'activity' && <section aria-label="Activity">
          <div className="mb-5"><span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">From the community</span><h2 className="font-heading text-2xl font-bold tracking-tight">Reading activity</h2></div>
          {communityError && <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{communityError}</div>}
          {activity.length ? <div className="flex flex-col">{activity.map((item) => <article key={item.id} className="border-t border-border py-4 first:border-t-0 first:pt-0"><Badge variant="secondary" className="mb-2">{item.type}</Badge><p className="text-base font-medium break-words">{item.text}</p>{item.date && <time className="text-xs text-muted-foreground" dateTime={item.date}>{new Date(item.date).toLocaleDateString()}</time>}</article>)}</div> : <p className="py-4 text-sm text-muted-foreground">No activity yet. <a className="font-medium text-foreground hover:underline" href={appPath('/community')}>Join a discussion</a>.</p>}
        </section>}

        {!isMine && currentTab === 'posts' && <section aria-label="Community posts">
          <div className="mb-5"><span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">From the community</span><h2 className="font-heading text-2xl font-bold tracking-tight">Community posts</h2></div>
          {communityError && <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{communityError}</div>}
          {publicPosts.length ? <div className="flex flex-col">{publicPosts.map((post) => <article key={post._id} className="border-t border-border py-4 first:border-t-0 first:pt-0"><Badge variant="secondary" className="mb-2">{post.category}</Badge><p className="text-base font-medium"><a className="hover:underline" href={appPath('/community')}>{post.title}</a></p><p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{post.body}</p>{post.createdAt && <time className="mt-1 block text-xs text-muted-foreground" dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString()}</time>}</article>)}</div> : <p className="py-4 text-sm text-muted-foreground">No community posts available here yet.</p>}
        </section>}

        {currentTab === 'about' && <section aria-label="About reader">
          <div className="mb-5"><span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Get to know {isMine ? 'yourself' : 'this reader'}</span><h2 className="font-heading text-2xl font-bold tracking-tight">About {isMine ? 'you' : profile.name || 'this reader'}</h2></div>
          <dl className="flex flex-col">
            <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-4 border-t border-border py-3.5 first:border-t-0 first:pt-0 max-sm:grid-cols-1 max-sm:gap-0.5"><dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Bio</dt><dd className="text-sm break-words">{profile.bio || (isMine ? 'Add a bio from Edit profile.' : 'No bio provided.')}</dd></div>
            <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-4 border-t border-border py-3.5 max-sm:grid-cols-1 max-sm:gap-0.5"><dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">City</dt><dd className="text-sm">{profile.city || 'Not provided'}</dd></div>
            <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-4 border-t border-border py-3.5 max-sm:grid-cols-1 max-sm:gap-0.5"><dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Favorite genres</dt><dd className="text-sm">{profile.genres?.length ? profile.genres.join(', ') : 'Not provided'}</dd></div>
            {joined && <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-4 border-t border-border py-3.5 max-sm:grid-cols-1 max-sm:gap-0.5"><dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Member since</dt><dd className="text-sm">{joined}</dd></div>}
            {reviews > 0 && <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-4 border-t border-border py-3.5 max-sm:grid-cols-1 max-sm:gap-0.5"><dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Reputation</dt><dd className="text-sm">{Number(rating).toFixed(1)} from {reviews} review{reviews === 1 ? '' : 's'}</dd></div>}
          </dl>
        </section>}

        {editBook && isMine && <Card className="mt-4"><CardContent><h2 className="mb-4 font-heading text-lg font-medium">Edit {editBook.title}</h2><form onSubmit={saveBook}><FieldGroup>
          <Field><FieldLabel htmlFor="eb-title">Title</FieldLabel><Input id="eb-title" name="title" defaultValue={editBook.title} maxLength={200} required /></Field>
          <Field><FieldLabel htmlFor="eb-author">Author</FieldLabel><Input id="eb-author" name="author" defaultValue={editBook.author} maxLength={100} /></Field>
          <Field><FieldLabel htmlFor="eb-genre">Genre</FieldLabel><Input id="eb-genre" name="genre" defaultValue={editBook.genre} /></Field>
          <Field><FieldLabel htmlFor="eb-condition">Condition</FieldLabel><Select name="condition" defaultValue={editBook.condition}><SelectTrigger id="eb-condition"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="New">New</SelectItem><SelectItem value="Like New">Like New</SelectItem><SelectItem value="Used">Used</SelectItem></SelectGroup></SelectContent></Select></Field>
          <Field><FieldLabel htmlFor="eb-city">City</FieldLabel><Input id="eb-city" name="city" defaultValue={editBook.location?.city} maxLength={100} /></Field>
          <Field><FieldLabel htmlFor="eb-desc">Description</FieldLabel><Textarea id="eb-desc" name="description" defaultValue={editBook.description} rows={3} maxLength={3000} /></Field>
          <Field orientation="horizontal"><input type="checkbox" name="barter" defaultChecked={editBook.barterAvailable} className="size-4 accent-primary" id="eb-barter" /><FieldLabel htmlFor="eb-barter" className="font-normal">Available for exchange</FieldLabel></Field>
          <Field orientation="horizontal"><input type="checkbox" name="borrow" defaultChecked={editBook.borrowAvailable} className="size-4 accent-primary" id="eb-borrow" /><FieldLabel htmlFor="eb-borrow" className="font-normal">Available to borrow</FieldLabel></Field>
          <div className="flex gap-2"><Button type="submit">Save listing</Button><Button type="button" variant="outline" onClick={() => setEditBook(null)}>Cancel</Button></div>
        </FieldGroup></form></CardContent></Card>}
      </div>
    </>}
    </main>
  </div></PageShell>;
}
