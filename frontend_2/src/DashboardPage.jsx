import { appPath } from './services/paths.js';
import { useEffect, useState } from 'react';
import { BookOpen, BookCheck, Repeat, Heart, MessageSquare, Bell, Plus, Sun, Moon, ArrowUpRight, MapPin, Calendar, Pencil, AlertTriangle, MailCheck, MailWarning } from 'lucide-react';
import PageShell from './components/PageShell.jsx';
import BrandAvatar from './components/BrandAvatar.jsx';
import { useAuth } from './services/AuthContext.jsx';
import useInboxSummary from './services/useInboxSummary.js';
import { normalizeUsername, usernameError } from './services/username.js';
import { api, getAllBooks, localGet, localSet, photoUrl } from './services/api.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { FieldGroup, Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const STATUS = {
  available: { label: 'Available', variant: 'default' },
  reserved: { label: 'Reserved', variant: 'secondary' },
  exchanged: { label: 'Exchanged', variant: 'outline' },
  sold: { label: 'Sold', variant: 'outline' },
};
const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
const memberSince = (iso) => { if (!iso) return ''; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); };
const num = (v) => (v === null || v === undefined ? '—' : v);
const readImage = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read this photo.')); reader.readAsDataURL(file); });

export default function DashboardPage() {
  const { user, loading: authLoading, error: authError, refresh, openAuth, openVerifyCode } = useAuth();
  const { unread, pending } = useInboxSummary();
  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]); const [wishlist, setWishlist] = useState(null); const [offers, setOffers] = useState(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [theme, setTheme] = useState(() => localGet('betterreads.dash-theme', 'light'));
  const [editing, setEditing] = useState(() => new URLSearchParams(window.location.search).get('edit') === '1'); const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null); const [avatarPreview, setAvatarPreview] = useState('');
  const [editBook, setEditBook] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); const [deleting, setDeleting] = useState(false);

  const id = user?.id;
  // Username is now a real, server-enforced field on the profile.
  const username = profile?.username || user?.username || '';

  useEffect(() => { localSet('betterreads.dash-theme', theme); }, [theme]);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  async function loadBooks() { if (id) setBooks(await getAllBooks(`&sellerId=${encodeURIComponent(id)}`)); }

  useEffect(() => {
    if (!user) { setLoading(false); return undefined; }
    let active = true; setLoading(true); setError('');
    Promise.all([
      api(`/api/users/${encodeURIComponent(user.id)}`).then((d) => d.user).catch(() => null),
      getAllBooks(`&sellerId=${encodeURIComponent(user.id)}`),
      api('/api/wishlist').then((d) => d.wishlist || []).catch(() => null),
      api('/api/offers').catch(() => null),
    ]).then(([prof, list, saved, offerList]) => { if (!active) return; setProfile(prof); setBooks(list); setWishlist(saved); setOffers(offerList); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  function selectAvatar(event) { const file = event.target.files?.[0]; setError(''); if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) { setError('Choose a JPEG, PNG, or WebP image up to 5 MB.'); event.target.value = ''; return; } setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  async function saveProfile(event) { event.preventDefault(); if (saving) return; const form = new FormData(event.currentTarget); const name = String(form.get('name')).trim(); const handle = normalizeUsername(form.get('username')); if (!name) { setError('Enter your name.'); return; } const handleProblem = usernameError(handle); if (handleProblem) { setError(handleProblem); return; } setSaving(true); setError(''); try { let avatarUrl = profile?.avatarUrl || ''; if (avatarFile) { const upload = await api('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: await readImage(avatarFile) }) }); if (!upload.url) throw new Error('Unable to upload your avatar.'); avatarUrl = upload.url; } const data = await api(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, username: handle, bio: String(form.get('bio')).trim(), city: String(form.get('city')).trim(), genres: String(form.get('genres')).split(',').map((g) => g.trim()).filter(Boolean), avatarUrl }) }); setProfile(data.user); window.dispatchEvent(new Event('betterreads:profile-change')); setAvatarFile(null); setAvatarPreview(''); setEditing(false); toast.success('Profile updated'); } catch (err) { setError(err.status === 409 ? err.message : ''); toast.error(err.message); } finally { setSaving(false); } }
  async function saveBook(event) { event.preventDefault(); const form = new FormData(event.currentTarget); try { await api(`/api/books/${encodeURIComponent(editBook._id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: String(form.get('title')).trim(), author: String(form.get('author')).trim(), genre: String(form.get('genre')).trim(), condition: form.get('condition'), city: String(form.get('city')).trim(), description: String(form.get('description')).trim(), barterAvailable: form.has('barter'), borrowAvailable: form.has('borrow') }) }); setEditBook(null); await loadBooks(); toast.success('Listing updated'); } catch (err) { toast.error(err.message); } }
  async function confirmDelete() { if (!deleteTarget || deleting) return; setDeleting(true); setError(''); try { await api(`/api/books/${encodeURIComponent(deleteTarget._id)}`, { method: 'DELETE' }); await loadBooks(); toast.success(`"${deleteTarget.title}" deleted`); setDeleteTarget(null); } catch (err) { toast.error(err.message); } finally { setDeleting(false); } }
  // Prefer the freshly-loaded profile, falling back to the auth user, for the
  // verified flag so the badge updates as soon as either source says verified.
  const emailVerified = Boolean(profile?.emailVerified ?? user?.emailVerified);

  const available = books.filter((b) => b.status === 'available').length;
  const exchanges = offers === null ? null : offers.filter((o) => o.type === 'barter' && o.status === 'accepted').length;
  const exchangesLabel = exchanges === null ? '—' : `${exchanges}${offers.length >= 100 ? '+' : ''}`;
  const wishlistCount = wishlist === null ? null : wishlist.length;
  const recent = [...books].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const joined = memberSince(profile?.createdAt);

  const openInbox = (tab) => window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab } }));

  const kpis = [
    { key: 'listed', label: 'Books listed', value: books.length, icon: BookOpen },
    { key: 'available', label: 'Available', value: available, icon: BookCheck },
    { key: 'exchanges', label: 'Exchanges', value: exchangesLabel, icon: Repeat },
    { key: 'wishlist', label: 'Wishlist', value: num(wishlistCount), icon: Heart },
  ];

  const inboxRows = [
    { icon: MessageSquare, label: 'Unread messages', count: unread, action: () => openInbox('messages'), cta: 'Open' },
    { icon: Bell, label: 'Pending requests', count: pending, action: () => openInbox('requests'), cta: 'Review' },
  ];

  return <PageShell><div className={cn(theme === 'dark' && 'dark')}>
    <main className="min-h-[calc(100vh-92px)] bg-background text-foreground font-sans">
      <div className="mx-auto w-full max-w-[1800px] px-6 py-6 max-sm:px-4">
        {authLoading ? <div className="py-14 text-muted-foreground" role="status">Loading your dashboard…</div>
          : authError && !user ? <div className="flex flex-col items-start gap-3 py-14" role="alert"><p className="text-muted-foreground">{authError}</p><Button variant="outline" onClick={refresh}>Try again</Button></div>
          : !user ? <div className="flex min-h-[calc(100vh-92px-3rem)] flex-col items-center justify-center gap-4 py-14 text-center"><div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><BookOpen className="size-6" /></div><div><h1 className="font-heading text-2xl font-bold tracking-tight">Your reading dashboard</h1><p className="mt-1 max-w-sm text-sm text-muted-foreground">Log in to manage your listings, wishlist, and requests.</p></div><Button onClick={() => openAuth('login', 'Log in to open your dashboard.')}>Log in or sign up</Button></div>
          : <>
          {notice && <div className="mb-5 rounded-lg border border-border bg-muted px-4 py-3 text-sm" role="status">{notice}</div>}
          {error && <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</div>}


          <Card className="min-h-[calc(100vh-92px-3rem)] gap-0 overflow-hidden p-0">
          <div className="grid h-full grid-cols-[340px_minmax(0,1fr)] items-stretch max-[960px]:grid-cols-1">
            {/* LEFT: profile + inbox */}
            <div className="flex h-full flex-col gap-4 border-r border-border p-6 max-[960px]:border-r-0 max-[960px]:border-b">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Profile</span>
                  <Button variant="ghost" size="icon-sm" aria-label="Edit profile" onClick={() => { setEditing(!editing); setError(''); }}><Pencil /></Button>
                </div>
                <div className="flex items-center gap-3">
                  <BrandAvatar user={profile || user} className="size-14" fallbackClassName="text-lg" />
                  <div className="flex min-w-0 flex-col">
                    <h2 className="font-heading text-lg font-semibold break-words">{profile?.name || user.name || 'Reader'}</h2>
                    {username && <span className="text-sm font-medium text-primary">@{username}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><MapPin className="size-3.5 shrink-0" /> {profile?.city || 'Location not provided'}</span>
                  {joined && <span className="flex items-center gap-2"><Calendar className="size-3.5 shrink-0" /> Joined {joined}</span>}
                </div>
                <p className="text-sm text-foreground/90">{profile?.bio || 'Tell readers a little about yourself — add a bio from Edit profile.'}</p>
                {(profile?.genres || []).length > 0 && <div className="flex flex-wrap gap-1.5">{profile.genres.map((g) => <Badge key={g} variant="secondary">{g}</Badge>)}</div>}

                <div className="border-t border-border" />

                {/* Email verification status */}
                <div className="flex items-start gap-3">
                  <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg border', emailVerified ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400')}>
                    {emailVerified ? <MailCheck className="size-4" /> : <MailWarning className="size-4" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-sm font-medium">{emailVerified ? 'Email verified' : 'Email not verified'}</span>
                    {emailVerified
                      ? <span className="text-xs text-muted-foreground break-words">{profile?.email || user.email}</span>
                      : <><span className="text-xs text-muted-foreground">Verify to make offers, borrow, and message readers.</span><Button variant="outline" size="sm" className="mt-1 self-start" onClick={openVerifyCode}>Verify email</Button></>}
                  </div>
                </div>

                <div className="border-t border-border" />

                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Your inbox</span>
                  {inboxRows.map((row) => { const Icon = row.icon; return <div key={row.label} className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-foreground"><Icon className="size-4" /></div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium">{row.label}</span>
                      <span className="text-xs text-muted-foreground">{num(row.count)} {row.cta === 'Open' ? 'waiting' : 'to review'}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={row.action}>{row.cta}</Button>
                  </div>; })}
                </div>
            </div>

            {/* RIGHT: dashboard, same surface */}
            <div className="flex min-h-0 flex-col p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Overview</span>
                  <h1 className="font-heading text-2xl font-bold tracking-tight">Dashboard</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun /> : <Moon />}</Button>
                  <Button asChild><a href={appPath('/list-book')}><Plus data-icon="inline-start" /> List a book</a></Button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1.8fr)_minmax(0,1fr)] items-stretch gap-6 max-[1180px]:grid-cols-1 max-[1180px]:items-start">
                {/* Stats column (vertical) */}
                <div className="flex flex-col max-[1180px]:order-1 max-[1180px]:flex-row max-[1180px]:flex-wrap">
                  {kpis.map((k) => { const Icon = k.icon; return <div key={k.key} className="flex items-center justify-between gap-2 border-b border-border py-3.5 last:border-b-0 max-[1180px]:min-w-[150px] max-[1180px]:flex-1 max-[1180px]:border-b-0">
                    <div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4" /><span className="text-sm">{k.label}</span></div>
                    {loading && typeof k.value !== 'string' ? <Skeleton className="h-6 w-8" /> : <span className="font-heading text-xl font-bold leading-none">{k.value}</span>}
                  </div>; })}
                </div>

                {/* Your listing */}
                <div className="flex flex-col gap-4 border-l border-border pl-6 max-[1180px]:order-2 max-[1180px]:border-l-0 max-[1180px]:border-t max-[1180px]:pl-0 max-[1180px]:pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <h2 className="font-heading text-base font-medium">Your listing</h2>
                      <p className="text-sm text-muted-foreground">Manage the books you've shared.</p>
                    </div>
                    <Button asChild variant="outline" size="sm"><a href={appPath('/books')}>Browse all <ArrowUpRight data-icon="inline-end" /></a></Button>
                  </div>
                  {loading ? <div className="flex flex-col gap-3 py-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                    : !recent.length ? <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><BookOpen className="size-5" /></div>
                        <p className="text-sm text-muted-foreground">You haven't listed any books yet.</p>
                        <Button asChild size="sm"><a href={appPath('/list-book')}><Plus data-icon="inline-start" /> List your first book</a></Button>
                      </div>
                    : <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Book</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Manage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recent.slice(0, 8).map((b) => { const s = STATUS[b.status] || STATUS.available; return <TableRow key={b._id}>
                            <TableCell>
                              <a className="flex flex-col gap-0.5 hover:underline" href={appPath(`/books/${encodeURIComponent(b._id)}`)}>
                                <span className="font-medium text-foreground">{b.title}</span>
                                <span className="text-xs text-muted-foreground">{b.author || 'Unknown author'} · {b.condition || '—'}</span>
                              </a>
                            </TableCell>
                            <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                            <TableCell className="text-right">{b.status === 'available' ? <div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => setEditBook(b)}>Edit</Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(b)}>Delete</Button></div> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                          </TableRow>; })}
                        </TableBody>
                      </Table>}
                </div>

                {/* Recent activity */}
                <div className="flex flex-col gap-4 border-l border-border pl-6 max-[1180px]:order-3 max-[1180px]:border-l-0 max-[1180px]:border-t max-[1180px]:pl-0 max-[1180px]:pt-5">
                  <div className="flex flex-col gap-1">
                    <h2 className="font-heading text-base font-medium">Recent activity</h2>
                    <p className="text-sm text-muted-foreground">Your latest listings.</p>
                  </div>
                  {loading ? <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                    : !recent.length ? <p className="text-sm text-muted-foreground">Nothing yet. <a className="font-medium text-foreground hover:underline" href={appPath('/list-book')}>List a book</a> to get started.</p>
                    : <ol className="flex flex-col gap-0">{recent.slice(0, 6).map((b, i, arr) => <li key={b._id} className="flex gap-3 pb-4 last:pb-0">
                        <div className="relative flex flex-col items-center">
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                          {i < arr.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm">Listed <a className="font-medium text-foreground hover:underline" href={appPath(`/books/${encodeURIComponent(b._id)}`)}>{b.title}</a></p>
                          <time className="text-xs text-muted-foreground" dateTime={b.createdAt}>{fmtDate(b.createdAt)}</time>
                        </div>
                      </li>)}</ol>}
                </div>
              </div>
            </div>
          </div>
          </Card>

          <Dialog
            open={editing}
            onOpenChange={(open) => { setEditing(open); if (!open) { setAvatarFile(null); setAvatarPreview(''); setError(''); } }}
          >
            <DialogContent className="flex max-h-[90dvh] w-full flex-col gap-0 p-0 sm:max-w-2xl">
              <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-border px-6 py-4">
                <DialogTitle className="font-heading text-xl font-semibold">Edit profile</DialogTitle>
                <DialogDescription className="sr-only">Update how other readers see you on Bettereads.</DialogDescription>
              </DialogHeader>
              <form onSubmit={saveProfile} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                  <FieldGroup className="gap-6">
                    <Field orientation="horizontal" className="items-center">
                      <Avatar className="size-20 ring-2 ring-border">
                        <AvatarImage src={avatarPreview || (profile?.avatarUrl ? photoUrl(profile.avatarUrl) : undefined)} alt="" />
                        <AvatarFallback className="text-2xl">{(profile?.name || user.name || 'R').slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <FieldLabel htmlFor="dash-pf-photo" className="text-sm font-medium">Profile photo</FieldLabel>
                        <Input id="dash-pf-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} className="file:text-xs" />
                        <FieldDescription>JPEG, PNG, or WebP up to 5 MB.</FieldDescription>
                      </div>
                    </Field>
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                      <Field>
                        <FieldLabel htmlFor="dash-pf-name">Display name</FieldLabel>
                        <Input id="dash-pf-name" name="name" defaultValue={profile?.name} required maxLength={100} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="dash-pf-username">Username</FieldLabel>
                        <Input id="dash-pf-username" name="username" defaultValue={username} minLength={3} maxLength={30} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="your-handle" required />
                        <FieldDescription>3–30 letters, numbers, dots or underscores. Shown as @{username || 'yourname'}.</FieldDescription>
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="dash-pf-bio">Bio</FieldLabel>
                      <Textarea id="dash-pf-bio" name="bio" defaultValue={profile?.bio} maxLength={1000} rows={4} placeholder="Share what you love to read…" />
                      <FieldDescription>Up to 1000 characters.</FieldDescription>
                    </Field>
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                      <Field>
                        <FieldLabel htmlFor="dash-pf-city">City</FieldLabel>
                        <Input id="dash-pf-city" name="city" defaultValue={profile?.city} maxLength={100} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="dash-pf-genres">Favorite genres</FieldLabel>
                        <Input id="dash-pf-genres" name="genres" defaultValue={(profile?.genres || []).join(', ')} placeholder="Fantasy, Mystery" />
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

          <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
            <DialogContent>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="size-5" /></div>
                  <div className="flex flex-col gap-1">
                    <DialogTitle>Delete this listing?</DialogTitle>
                    <DialogDescription>This action cannot be undone. "{deleteTarget?.title}" will be permanently removed from your listings and the catalog.</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={deleting}>Cancel</Button></DialogClose>
                <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete listing'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {editBook && <Card className="mt-5"><CardContent><h2 className="mb-4 font-heading text-lg font-medium">Edit {editBook.title}</h2><form onSubmit={saveBook}><FieldGroup>
            <Field><FieldLabel htmlFor="eb-title">Title</FieldLabel><Input id="eb-title" name="title" defaultValue={editBook.title} maxLength={200} required /></Field>
            <Field><FieldLabel htmlFor="eb-author">Author</FieldLabel><Input id="eb-author" name="author" defaultValue={editBook.author} maxLength={100} /></Field>
            <Field><FieldLabel htmlFor="eb-genre">Genre</FieldLabel><Input id="eb-genre" name="genre" defaultValue={editBook.genre} /></Field>
            <Field><FieldLabel htmlFor="eb-condition">Condition</FieldLabel><Select name="condition" defaultValue={editBook.condition}><SelectTrigger id="eb-condition" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="New">New</SelectItem><SelectItem value="Like New">Like New</SelectItem><SelectItem value="Used">Used</SelectItem></SelectGroup></SelectContent></Select></Field>
            <Field><FieldLabel htmlFor="eb-city">City</FieldLabel><Input id="eb-city" name="city" defaultValue={editBook.location?.city} maxLength={100} /></Field>
            <Field><FieldLabel htmlFor="eb-desc">Description</FieldLabel><Textarea id="eb-desc" name="description" defaultValue={editBook.description} rows={3} maxLength={3000} /></Field>
            <Field orientation="horizontal"><input type="checkbox" name="barter" defaultChecked={editBook.barterAvailable} className="size-4 accent-primary" id="eb-barter" /><FieldLabel htmlFor="eb-barter" className="font-normal">Available for exchange</FieldLabel></Field>
            <Field orientation="horizontal"><input type="checkbox" name="borrow" defaultChecked={editBook.borrowAvailable} className="size-4 accent-primary" id="eb-borrow" /><FieldLabel htmlFor="eb-borrow" className="font-normal">Available to borrow</FieldLabel></Field>
            <div className="flex gap-2"><Button type="submit">Save listing</Button><Button type="button" variant="outline" onClick={() => setEditBook(null)}>Cancel</Button></div>
          </FieldGroup></form></CardContent></Card>}
        </>}
      </div>
    </main>
  </div></PageShell>;
}
