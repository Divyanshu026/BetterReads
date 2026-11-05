import { appPath } from '../services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, Send } from 'lucide-react';
import { api, photoUrl } from '../services/api.js';

const userId = (sender) => String(sender?._id || sender);
const unreadCount = (messages, user) => messages.filter((m) => !m.seen && userId(m.senderId) !== String(user.id)).length;

export default function MessageInbox({ user, initialChatId, bookId, onUpdate }) {
  const [chats, setChats] = useState([]); const [selected, setSelected] = useState(null); const [messages, setMessages] = useState([]); const [book, setBook] = useState(null);
  const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true); const [opening, setOpening] = useState(false); const [sending, setSending] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const selectedRef = useRef(null); const historyRef = useRef(null);
  async function openChat(chat) {
    setOpening(true); setError(''); setNotice(''); setSelected(chat); selectedRef.current = chat._id;
    try {
      const data = await api(`/api/chats/${encodeURIComponent(chat._id)}`);
      if (selectedRef.current !== chat._id) return;
      setMessages(data.messages || []);
      await api(`/api/chats/${encodeURIComponent(chat._id)}/read`, { method: 'PATCH' });
      setChats((items) => items.map((item) => item._id === chat._id ? { ...item, unread: 0 } : item));
      window.dispatchEvent(new Event('betterreads:inbox-change')); onUpdate?.();
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
    load(); return () => { active = false; selectedRef.current = null; };
  }, [user.id, initialChatId]);
  useEffect(() => {
    let active = true;
    if (!bookId || !initialChatId) { setBook(null); return () => { active = false; }; }
    api(`/api/books/${encodeURIComponent(bookId)}`).then((data) => { if (active) setBook(data); }).catch(() => { if (active) setBook(null); });
    return () => { active = false; };
  }, [bookId, initialChatId]);
  useEffect(() => { if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight; }, [messages, selected]);
  async function send(event) {
    event.preventDefault(); const form = event.currentTarget; const text = String(new FormData(form).get('message') || '').trim(); if (!text || sending || !selected) return;
    setSending(true); setError(''); setNotice('');
    try {
      const message = await api(`/api/chats/${encodeURIComponent(selected._id)}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      setMessages((items) => [...items, message]); setChats((items) => items.map((chat) => chat._id === selected._id ? { ...chat, lastMessage: text, updatedAt: message.createdAt } : chat)); form.reset(); setNotice('Message sent.');
    } catch (err) { setError(err.message); } finally { setSending(false); }
  }
  const shown = chats.filter((chat) => `${chat.participant?.name || ''} ${chat.lastMessage || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section className={`message-workspace ${selected ? 'has-selection' : ''}`} aria-label="Conversations">
    <div className="conversation-sidebar"><label className="conversation-search"><Search size={17} aria-hidden="true" /><span className="visually-hidden">Search conversations</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" /></label>{loading ? <p role="status">Loading conversations…</p> : !shown.length ? <p>{search ? 'No conversations match your search.' : 'No conversations yet. Open a book to message its reader.'}</p> : <div className="conversation-list">{shown.map((chat) => <button type="button" key={chat._id} className={selected?._id === chat._id ? 'active' : ''} onClick={() => { if (chat._id !== initialChatId) setBook(null); openChat(chat); }}><span className="conversation-avatar">{chat.participant?.avatarUrl ? <img src={photoUrl(chat.participant.avatarUrl)} alt="" /> : (chat.participant?.name || 'R').slice(0, 1).toUpperCase()}</span><span className="conversation-summary"><strong>{chat.participant?.name || 'Reader'}</strong><span>{chat.lastMessage || 'Start a conversation'}</span><small>{chat.updatedAt ? new Date(chat.updatedAt).toLocaleString() : ''}</small></span>{chat.unread > 0 && <span className="conversation-unread" aria-label={`${chat.unread} unread messages`}>{chat.unread}</span>}</button>)}</div>}</div>
    <div className="conversation-main">{selected ? <><header className="conversation-header"><button className="conversation-back" type="button" onClick={() => { setSelected(null); selectedRef.current = null; }} aria-label="Back to conversations"><ArrowLeft size={18} /></button><span className="conversation-avatar">{selected.participant?.avatarUrl ? <img src={photoUrl(selected.participant.avatarUrl)} alt="" /> : (selected.participant?.name || 'R').slice(0, 1).toUpperCase()}</span><div><strong>{selected.participant?.name || 'Reader'}</strong><a href={appPath(`/readers/${selected.participant?._id}`)}>View reader profile</a></div></header>{book && selected._id === initialChatId && <a className="chat-book-reference" href={appPath(`/books/${book._id}`)}>{book.photos?.[0] && <img src={photoUrl(book.photos[0])} alt="" />}<span>Discussing <strong>{book.title}</strong></span></a>}<div className="conversation-history" ref={historyRef} aria-label="Message history">{opening ? <p role="status">Loading messages…</p> : !messages.length ? <p>Start the conversation by saying hello.</p> : messages.map((message) => { const own = userId(message.senderId) === String(user.id); return <div className={`message-bubble ${own ? 'outgoing' : 'incoming'}`} key={message._id}><p>{message.text}</p>{message.createdAt && <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>}</div>; })}</div>{error && <p className="account-error" role="alert">{error}</p>}{notice && <p className="message-notice" role="status">{notice}</p>}<form className="conversation-composer" onSubmit={send}><label className="visually-hidden" htmlFor="inbox-message">Your message</label><textarea id="inbox-message" name="message" rows={2} maxLength={4000} required placeholder="Write a message…" /><button type="submit" disabled={sending || opening} aria-label="Send message"><Send size={18} /></button></form></> : <div className="conversation-empty"><h3>Your conversations</h3><p>Select a reader to see your messages.</p>{error && <p role="alert" className="account-error">{error}</p>}</div>}</div>
  </section>;
}
