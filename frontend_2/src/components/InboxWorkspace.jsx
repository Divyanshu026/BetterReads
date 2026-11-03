import { useState } from 'react';
import AccountPanel from './AccountPanel.jsx';
import MessageInbox from './MessageInbox.jsx';
import RequestInbox from './RequestInbox.jsx';
import useReader from '../services/useReader.js';

export default function InboxWorkspace({ initialTab = 'messages', initialChatId, bookId, onUpdate }) {
  const { user, loading, refresh } = useReader();
  const [tab, setTab] = useState(initialTab);
  if (loading) return <p role="status">Loading your account…</p>;
  if (!user) return <div className="inbox-signin"><h2>Log in to your inbox</h2><AccountPanel onAuthenticated={refresh} /></div>;
  return <div className="inbox-workspace"><div className="inbox-tabs" role="group" aria-label="Inbox sections"><button type="button" aria-pressed={tab === 'messages'} onClick={() => setTab('messages')}>Messages</button><button type="button" aria-pressed={tab === 'requests'} onClick={() => setTab('requests')}>Book requests</button></div>{tab === 'messages' ? <MessageInbox user={user} initialChatId={initialChatId} bookId={bookId} onUpdate={onUpdate} /> : <RequestInbox user={user} onUpdate={onUpdate} />}</div>;
}
