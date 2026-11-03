import { useEffect, useState } from 'react';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const token = () => localStorage.getItem('betterreads.authToken') || sessionStorage.getItem('betterreads.authToken');
async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { Authorization: `Bearer ${token()}`, ...options.headers } });
  if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Unable to reach the message server.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'Unable to load messages.');
  return result;
}

export default function MessageInbox({ user, onClose }) {
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setBusy(true);
    request('/api/chats').then((data) => { if (active) setChats(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  async function openChat(chat) {
    setBusy(true); setError('');
    try {
      const data = await request(`/api/chats/${encodeURIComponent(chat._id)}`);
      setSelected(chat); setMessages(data.messages || []);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function send(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get('message') || '').trim();
    if (!text || busy) return;
    setBusy(true); setError('');
    try {
      const message = await request(`/api/chats/${encodeURIComponent(selected._id)}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      setMessages((items) => [...items, message]);
      setChats((items) => items.map((chat) => chat._id === selected._id ? { ...chat, lastMessage: text } : chat));
      form.reset();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="account-inbox" aria-label="Messages">
      <button type="button" className="listing-return" onClick={selected ? () => setSelected(null) : onClose}>{selected ? 'Back to messages' : 'Back to profile'}</button>
      <h3>{selected ? selected.participant?.name || 'Reader' : 'Messages'}</h3>
      {error && <p className="account-error" role="alert">{error}</p>}
      {busy && <p role="status">Loading…</p>}
      {selected ? (
        <>
          <div className="detail-messages">{messages.length ? messages.map((message) => <p key={message._id}><strong>{String(message.senderId?._id || message.senderId) === String(user.id) ? 'You' : selected.participant?.name || 'Reader'}</strong> {message.text}</p>) : <p>No messages yet.</p>}</div>
          <form className="inbox-form" onSubmit={send}><label htmlFor="inbox-message">Your message</label><textarea id="inbox-message" name="message" rows={3} maxLength={4000} required /><button className="button button-red" type="submit" disabled={busy}>Send message</button></form>
        </>
      ) : !busy && (chats.length ? <div className="inbox-list">{chats.map((chat) => <button type="button" key={chat._id} onClick={() => openChat(chat)}><strong>{chat.participant?.name || 'Reader'}</strong><span>{chat.lastMessage || 'Start a conversation'}</span></button>)}</div> : !error && <p>No messages yet.</p>)}
    </section>
  );
}
