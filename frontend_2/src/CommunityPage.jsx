import { appPath } from './services/paths.js';
import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, BookText, MessageCircle, Search, Share2 } from 'lucide-react';
import PageShell from './components/PageShell.jsx';
import AccountPanel from './components/AccountPanel.jsx';
import useReader from './services/useReader.js';
import { api } from './services/api.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';

const categories = ['General Discussion', 'Book Recommendations', 'Currently Reading', 'Reviews', 'Book Clubs', 'Exchange & Borrowing Discussions'];
const json = (body) => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export default function CommunityPage() {
  const { user, loading: accountLoading, refresh } = useReader();
  const [posts, setPosts] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [category, setCategory] = useState(''); const [search, setSearch] = useState(''); const [expanded, setExpanded] = useState(''); const [comments, setComments] = useState({}); const [commentsMore, setCommentsMore] = useState({}); const [busy, setBusy] = useState(''); const [page, setPage] = useState(1); const [more, setMore] = useState(false);
  async function load(nextPage = 1, selected = category) { setLoading(true); setError(''); try { const data = await api(`/api/community/posts?page=${nextPage}${selected ? `&category=${encodeURIComponent(selected)}` : ''}`); setPosts((old) => nextPage === 1 ? data.posts : [...old, ...data.posts]); setPage(nextPage); setMore(data.hasMore); } catch (err) { setError(err.message); } finally { setLoading(false); } }
  useEffect(() => { load(1, category); }, [category]);
  async function publish(event) { event.preventDefault(); if (!user || busy) return; const form = event.currentTarget; const data = new FormData(form); setBusy('publish'); setError(''); setNotice(''); try { const post = await api('/api/community/posts', { method: 'POST', ...json({ title: String(data.get('title')).trim(), body: String(data.get('body')).trim(), category: data.get('category') }) }); form.reset(); if (category && category !== post.category) setCategory(''); else await load(1, category); setNotice('Your discussion is published.'); } catch (err) { setError(err.message); } finally { setBusy(''); } }
  async function openComments(post) { if (expanded === post._id) { setExpanded(''); return; } setExpanded(post._id); setError(''); try { const data = await api(`/api/community/posts/${post._id}/comments`); setComments((old) => ({ ...old, [post._id]: data.comments })); setCommentsMore((old) => ({ ...old, [post._id]: data.hasMore })); } catch (err) { setError(err.message); } }
  async function moreComments(postId) { const next = Math.floor((comments[postId] || []).length / 50) + 1; try { const data = await api(`/api/community/posts/${postId}/comments?page=${next}`); setComments((old) => ({ ...old, [postId]: [...(old[postId] || []), ...data.comments] })); setCommentsMore((old) => ({ ...old, [postId]: data.hasMore })); } catch (err) { setError(err.message); } }
  async function reply(event, post) { event.preventDefault(); if (!user || busy) return; const form = event.currentTarget; const body = String(new FormData(form).get('comment')).trim(); if (!body) return; setBusy(post._id); setError(''); try { const comment = await api(`/api/community/posts/${post._id}/comments`, { method: 'POST', ...json({ body }) }); if (!commentsMore[post._id]) setComments((old) => ({ ...old, [post._id]: [...(old[post._id] || []), comment] })); else setNotice('Reply posted. Load more replies to see it.'); setPosts((old) => old.map((item) => item._id === post._id ? { ...item, commentCount: item.commentCount + 1 } : item)); form.reset(); } catch (err) { setError(err.message); } finally { setBusy(''); } }
  async function like(post) { if (!user || busy) { if (!user) setError('Log in to appreciate a discussion.'); return; } const liked = (post.likes || []).some((id) => String(id) === String(user.id)); setBusy(post._id); setError(''); try { const data = await api(`/api/community/posts/${post._id}/like`, { method: 'PUT', ...json({ liked: !liked }) }); setPosts((old) => old.map((item) => item._id === post._id ? { ...item, likes: data.liked ? [...(item.likes || []), user.id] : (item.likes || []).filter((id) => String(id) !== String(user.id)) } : item)); } catch (err) { setError(err.message); } finally { setBusy(''); } }
  const q = search.trim().toLowerCase(); const shown = posts.filter((post) => `${post.title} ${post.body} ${post.author?.name || ''}`.toLowerCase().includes(q));
  return <PageShell>
    <main className="min-h-[calc(100vh-92px)] bg-background text-foreground font-sans">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-6 max-sm:px-4">
        {error && <div role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-lg border border-border bg-muted px-4 py-3 text-sm">{notice}</div>}

        <Card className="min-h-[calc(100vh-92px-3rem)] gap-0 overflow-hidden p-0">
          <div className="grid h-full grid-cols-[220px_minmax(0,1fr)_320px] items-stretch max-[1050px]:grid-cols-[minmax(0,1fr)_300px] max-[680px]:grid-cols-1">
            {/* LEFT: categories sidebar */}
            <div className="flex h-full flex-col gap-1 border-r border-border p-5 max-[1050px]:col-span-full max-[1050px]:flex-row max-[1050px]:overflow-x-auto max-[1050px]:border-r-0 max-[1050px]:border-b max-[680px]:col-span-1">
              <span className="px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase max-[1050px]:hidden">Explore</span>
              <button type="button" className={cn('rounded-md px-3 py-2 text-left text-sm font-medium leading-tight transition-colors hover:bg-muted max-[1050px]:whitespace-nowrap', !category ? 'bg-muted text-foreground' : 'text-muted-foreground')} onClick={() => setCategory('')}>All discussions</button>
              {categories.map((name) => <button type="button" key={name} className={cn('rounded-md px-3 py-2 text-left text-sm font-medium leading-tight transition-colors hover:bg-muted max-[1050px]:whitespace-nowrap', category === name ? 'bg-muted text-foreground' : 'text-muted-foreground')} onClick={() => setCategory(name)}>{name}</button>)}
            </div>

            {/* CENTER: discussions feed */}
            <section aria-label="Community discussions" className="flex min-w-0 flex-col gap-4 p-5">
              <div>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">A place for readers</span>
                <h1 className="font-heading text-2xl font-bold tracking-tight">The reading room</h1>
              </div>
              <label className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">Search loaded discussions</span>
                <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search discussions..." className="pl-9" />
              </label>
              {loading && !posts.length ? <p role="status" className="py-4 text-sm text-muted-foreground">Loading discussions…</p>
                : !shown.length ? <div className="flex flex-col items-center gap-2 py-10 text-center"><div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><BookText className="size-6" /></div><h2 className="font-heading text-lg font-medium">No discussions yet</h2><p className="text-sm text-muted-foreground">Start a conversation with other readers.</p></div>
                : <div className="flex flex-col divide-y divide-border">{shown.map((post) => { const liked = Boolean(user && (post.likes || []).includes(user.id)); const likeCount = post.likes?.length || 0; return <article key={post._id} className="flex flex-col gap-3 rounded-xl px-2 py-4 transition-colors hover:bg-muted/30">
                    <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{(post.author?.name || 'R').slice(0, 1).toUpperCase()}</div>
                      <a className="truncate font-medium hover:underline" href={appPath(`/readers/${post.author?._id}`)}>u/{(post.author?.name || 'reader').replace(/\s+/g, '').toLowerCase()}</a>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</span>
                      <Badge variant="secondary">{post.category}</Badge>
                    </header>
                    <h2 className="font-heading text-xl font-bold leading-snug break-words">{post.title}</h2>
                    <p className="text-sm whitespace-pre-wrap text-foreground/90 break-words leading-relaxed">{post.body}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={cn('flex items-center gap-1 rounded-full px-1 py-1 transition-colors', liked ? 'bg-primary/15' : 'bg-muted')}>
                        <button type="button" aria-label={`Appreciate ${post.title}`} aria-pressed={liked} disabled={!!busy} onClick={() => like(post)} className={cn('flex size-7 items-center justify-center rounded-full transition-colors hover:bg-background', liked && 'text-primary')}><ArrowUp className="size-4" /></button>
                        <strong className={cn('min-w-4 text-center text-xs font-semibold tabular-nums', liked ? 'text-primary' : 'text-foreground')}>{likeCount}</strong>
                        <button type="button" aria-label="Downvote" disabled className="flex size-7 items-center justify-center rounded-full text-muted-foreground opacity-50"><ArrowDown className="size-4" /></button>
                      </div>
                      <button type="button" className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent" aria-expanded={expanded === post._id} onClick={() => openComments(post)}><MessageCircle className="size-4" /> {post.commentCount || 0}</button>
                      <button type="button" className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"><Share2 className="size-4" /> Share</button>
                    </div>
                    {expanded === post._id && <div className="mt-1 flex flex-col gap-3 border-t border-border pt-4">
                      {!comments[post._id] ? <p className="text-sm text-muted-foreground">Loading replies…</p>
                        : comments[post._id].length ? comments[post._id].map((entry) => <div className="flex gap-2 text-sm" key={entry._id}>
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{(entry.author?.name || 'R').slice(0, 1).toUpperCase()}</div>
                            <div className="min-w-0 flex-1"><a className="font-medium hover:underline" href={appPath(`/readers/${entry.author?._id}`)}>u/{(entry.author?.name || 'reader').replace(/\s+/g, '').toLowerCase()}</a><p className="mt-1 whitespace-pre-wrap text-foreground/90">{entry.body}</p></div>
                          </div>)
                        : <p className="text-sm text-muted-foreground">Be the first to reply.</p>}
                      {commentsMore[post._id] && <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => moreComments(post._id)}>Show more replies</Button>}
                      {user ? <form onSubmit={(event) => reply(event, post)}><FieldGroup><Field><FieldLabel htmlFor={`reply-${post._id}`}>Join the conversation</FieldLabel><Textarea id={`reply-${post._id}`} name="comment" rows={2} maxLength={1000} required placeholder="Write a thoughtful reply..." /></Field><Button type="submit" variant="outline" size="sm" className="self-start" disabled={!!busy}>Reply</Button></FieldGroup></form> : <p className="text-sm text-muted-foreground">Log in to reply.</p>}
                    </div>}
                  </article>; })}</div>}
              {more && <Button type="button" variant="outline" className="self-start" disabled={loading} onClick={() => load(page + 1)}>Load more discussions</Button>}
            </section>

            {/* RIGHT: start discussion form */}
            <div className="sticky top-[88px] flex flex-col gap-3 border-l border-border p-5 max-[1050px]:static max-[680px]:row-start-2 max-[680px]:border-l-0 max-[680px]:border-t">
              <div><span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Share a story</span><h2 className="font-heading text-xl font-semibold">Start a discussion</h2><p className="mt-1 text-sm text-muted-foreground">Ask a question, share a favourite, or find your next read.</p></div>
              {accountLoading ? <p className="text-sm text-muted-foreground">Loading account…</p> : user ? <form onSubmit={publish}><FieldGroup>
                <Field><FieldLabel htmlFor="c-title">Title</FieldLabel><Input id="c-title" name="title" maxLength={150} required placeholder="What's on your mind?" /></Field>
                <Field><FieldLabel htmlFor="c-category">Topic</FieldLabel><Select name="category" defaultValue={categories[0]}><SelectTrigger id="c-category" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{categories.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
                <Field><FieldLabel htmlFor="c-body">Your thoughts</FieldLabel><Textarea id="c-body" name="body" rows={4} maxLength={3000} required placeholder="Share with the community..." /></Field>
                <Button type="submit" disabled={!!busy}>{busy === 'publish' ? 'Publishing…' : 'Publish discussion'}</Button>
              </FieldGroup></form> : <AccountPanel onAuthenticated={refresh} />}
            </div>
          </div>
        </Card>
      </div>
    </main>
  </PageShell>;
}
