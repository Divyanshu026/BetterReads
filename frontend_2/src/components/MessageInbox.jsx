import { appPath } from '../services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, Send, MessageCircle, X } from 'lucide-react';
import { api, photoUrl } from '../services/api.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from '@/components/ui/input-group';
import { MessageGroup, Message, MessageAvatar, MessageContent, MessageFooter } from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Smile } from 'lucide-react';
import { EmojiPicker, EmojiPickerPanel } from '@/components/reui/emoji-picker';

const userId = (sender) => String(sender?._id || sender);
const unreadCount = (messages, user) => messages.filter((m) => !m.seen && userId(m.senderId) !== String(user.id)).length;

function PersonAvatar({ person, className }) {
  return (
    <Avatar className={cn('size-9', className)}>
      <AvatarImage src={person?.avatarUrl ? photoUrl(person.avatarUrl) : undefined} alt="" />
      <AvatarFallback>{(person?.name || 'R').slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString();
}

export default function MessageInbox({ user, initialChatId, bookId, onUpdate }) {
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [book, setBook] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const selectedRef = useRef(null);
  const historyRef = useRef(null);
  const messageRef = useRef(null);

  function insertEmoji(emoji) {
    const field = messageRef.current;
    const start = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? start;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      const node = messageRef.current;
      if (!node) return;
      const caret = start + emoji.length;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  }

  async function openChat(chat) {
    setOpening(true); setError(''); setNotice(''); setSelected(chat); selectedRef.current = chat._id;
    try {
      const data = await api(`/api/chats/${encodeURIComponent(chat._id)}`);
      if (selectedRef.current !== chat._id) return;
      setMessages(data.messages || []);
      await api(`/api/chats/${encodeURIComponent(chat._id)}/read`, { method: 'PATCH' });
      setChats((items) => items.map((item) => item._id === chat._id ? { ...item, unread: 0 } : item));
      window.dispatchEvent(new Event('betterreads:inbox-change'));
      onUpdate?.();
    } catch (err) { setError(err.message); }
    finally { setOpening(false); }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const list = await api('/api/chats');
        const enriched = await Promise.all(list.map(async (chat) => {
          try { const detail = await api(`/api/chats/${encodeURIComponent(chat._id)}`); return { ...chat, unread: unreadCount(detail.messages || [], user) }; }
          catch { return { ...chat, unread: null }; }
        }));
        if (!active) return;
        setChats(enriched);
        const match = enriched.find((chat) => chat._id === initialChatId);
        if (match) await openChat(match);
      } catch (err) { if (active) setError(err.message); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; selectedRef.current = null; };
  }, [user.id, initialChatId]);

  useEffect(() => {
    let active = true;
    if (!bookId || !initialChatId) { setBook(null); return () => { active = false; }; }
    api(`/api/books/${encodeURIComponent(bookId)}`).then((data) => { if (active) setBook(data); }).catch(() => { if (active) setBook(null); });
    return () => { active = false; };
  }, [bookId, initialChatId]);

  useEffect(() => { if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight; }, [messages, selected]);

  async function send(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || !selected) return;
    setSending(true); setError(''); setNotice('');
    try {
      const message = await api(`/api/chats/${encodeURIComponent(selected._id)}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      });
      setMessages((items) => [...items, message]);
      setChats((items) => items.map((chat) => chat._id === selected._id ? { ...chat, lastMessage: text, updatedAt: message.createdAt } : chat));
      setDraft('');
      setNotice('Message sent.');
    } catch (err) { setError(err.message); } finally { setSending(false); }
  }

  const shown = chats.filter((chat) => `${chat.participant?.name || ''} ${chat.lastMessage || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  return (
    <section className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] font-sans text-foreground max-sm:grid-cols-1" aria-label="Conversations">
      <aside className={cn('flex min-h-0 flex-col border-r border-border max-sm:border-r-0', selected && 'max-sm:hidden')}>
        <div className="border-b border-border p-3">
          <InputGroup className="h-9 rounded-full">
            <InputGroupAddon className="pl-3 text-muted-foreground"><Search aria-hidden="true" /></InputGroupAddon>
            <InputGroupInput
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
            />
            {search && (
              <InputGroupAddon align="inline-end" className="pr-1">
                <InputGroupButton size="icon-xs" variant="ghost" className="rounded-full" aria-label="Clear search" onClick={() => setSearch('')}>
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>
        {loading ? (
          <div className="flex flex-col gap-1 p-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div className="flex items-center gap-3 p-2" key={i}>
                <Skeleton className="size-9 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : !shown.length ? (
          <Empty className="gap-3 p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon"><MessageCircle aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>{search ? 'No matches' : 'No conversations yet'}</EmptyTitle>
              <EmptyDescription>
                {search ? 'Try a different name or message.' : 'Open a book to message its reader.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto p-1">
            {shown.map((chat) => (
              <li key={chat._id}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted',
                    selected?._id === chat._id && 'bg-muted',
                  )}
                  onClick={() => { if (chat._id !== initialChatId) setBook(null); openChat(chat); }}
                >
                  <PersonAvatar person={chat.participant} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate text-sm font-medium">{chat.participant?.name || 'Reader'}</strong>
                      {chat.updatedAt && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatTime(chat.updatedAt)}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={cn('truncate text-xs text-muted-foreground', chat.unread > 0 && 'font-medium text-foreground')}>
                        {chat.lastMessage || 'Start a conversation'}
                      </span>
                      {chat.unread > 0 && (
                        <Badge className="ml-auto shrink-0 tabular-nums" aria-label={`${chat.unread} unread messages`}>
                          {chat.unread > 99 ? '99+' : chat.unread}
                        </Badge>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className={cn('flex min-h-0 flex-col', !selected && 'max-sm:hidden')}>
        {selected ? (
          <>
            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                type="button"
                onClick={() => { setSelected(null); selectedRef.current = null; }}
                aria-label="Back to conversations"
              >
                <ArrowLeft />
              </Button>
              <PersonAvatar person={selected.participant} />
              <div className="flex min-w-0 flex-1 flex-col">
                <strong className="truncate text-sm font-medium">{selected.participant?.name || 'Reader'}</strong>
                <a className="truncate text-xs text-muted-foreground hover:underline" href={appPath(`/readers/${selected.participant?._id}`)}>
                  View reader profile
                </a>
              </div>
            </header>
            {book && selected._id === initialChatId && (
              <a className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-sm transition-colors hover:bg-muted" href={appPath(`/books/${book._id}`)}>
                {book.photos?.[0] && <img className="h-10 w-8 rounded-sm object-cover" src={photoUrl(book.photos[0])} alt="" />}
                <span className="min-w-0 flex-1 truncate">
                  Discussing <strong className="font-medium">{book.title}</strong>
                </span>
              </a>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" ref={historyRef} aria-label="Message history">
              {opening ? (
                <MessageGroup>
                  {[0, 1, 2].map((i) => (
                    <Message key={i} align={i % 2 === 0 ? 'start' : 'end'}>
                      <MessageContent>
                        <Skeleton className={cn('h-9', i % 2 === 0 ? 'w-56' : 'w-40 self-end')} />
                      </MessageContent>
                    </Message>
                  ))}
                </MessageGroup>
              ) : !messages.length ? (
                <Empty className="h-full justify-center gap-3">
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><MessageCircle aria-hidden="true" /></EmptyMedia>
                    <EmptyTitle>Say hello</EmptyTitle>
                    <EmptyDescription>Kick off the conversation with a friendly note.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <MessageGroup className="gap-3">
                  {messages.map((message, index) => {
                    const own = userId(message.senderId) === String(user.id);
                    const prev = messages[index - 1];
                    const showAvatar = !prev || userId(prev.senderId) !== userId(message.senderId);
                    return (
                      <Message key={message._id} align={own ? 'end' : 'start'}>
                        {!own && (
                          <MessageAvatar>
                            {showAvatar ? (
                              <PersonAvatar person={selected.participant} className="size-8" />
                            ) : (
                              <span aria-hidden="true" className="size-8" />
                            )}
                          </MessageAvatar>
                        )}
                        <MessageContent>
                          <Bubble variant={own ? 'default' : 'muted'} align={own ? 'end' : 'start'}>
                            <BubbleContent className="whitespace-pre-wrap">{message.text}</BubbleContent>
                          </Bubble>
                          {message.createdAt && <MessageFooter className="tabular-nums">{formatTime(message.createdAt)}</MessageFooter>}
                        </MessageContent>
                      </Message>
                    );
                  })}
                </MessageGroup>
              )}
            </div>
            {error && <p className="px-4 pb-1 text-sm text-destructive" role="alert">{error}</p>}
            {notice && <p className="px-4 pb-1 text-xs text-muted-foreground" role="status">{notice}</p>}
            <div className="relative border-t border-border">
              {emojiOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close emoji picker"
                    onClick={() => setEmojiOpen(false)}
                    className="absolute inset-0 z-10 bg-transparent"
                  />
                  <div className="absolute right-3 bottom-full z-20 mb-2 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                    <EmojiPicker
                      value={null}
                      aria-label="Pick an emoji"
                      onEmojiSelect={({ value }) => { insertEmoji(value); setEmojiOpen(false); }}
                    >
                      <EmojiPickerPanel />
                    </EmojiPicker>
                  </div>
                </>
              )}
              <form className="flex items-end gap-2 px-3 py-3" onSubmit={send}>
                <label className="sr-only" htmlFor="inbox-message">Your message</label>
                <Textarea
                  ref={messageRef}
                  id="inbox-message"
                  name="message"
                  rows={1}
                  maxLength={4000}
                  required
                  placeholder="Write a message…"
                  className="min-h-9 resize-none rounded-xl"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label="Add emoji"
                  aria-expanded={emojiOpen}
                  onClick={() => setEmojiOpen((open) => !open)}
                >
                  <Smile />
                </Button>
                <Button type="submit" size="icon" className="rounded-full" disabled={sending || opening} aria-label="Send message">
                  <Send />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <Empty className="h-full justify-center gap-3 max-sm:hidden">
            <EmptyHeader>
              <EmptyMedia variant="icon"><MessageCircle aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>Your conversations</EmptyTitle>
              <EmptyDescription>Select a reader to see your messages.</EmptyDescription>
            </EmptyHeader>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </Empty>
        )}
      </div>
    </section>
  );
}
