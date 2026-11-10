import { useState } from 'react';
import AccountPanel from './AccountPanel.jsx';
import MessageInbox from './MessageInbox.jsx';
import RequestInbox from './RequestInbox.jsx';
import useReader from '../services/useReader.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function InboxWorkspace({ initialTab = 'messages', initialChatId, bookId, onUpdate }) {
  const { user, loading, error, refresh } = useReader();
  const [tab, setTab] = useState(initialTab);
  if (loading) return <p role="status" className="p-6 text-sm text-muted-foreground">Loading your account…</p>;
  if (error && !user) return <div role="alert" className="flex flex-col items-start gap-3 p-6"><p className="text-sm text-muted-foreground">{error}</p><Button variant="outline" size="sm" onClick={refresh}>Try again</Button></div>;
  if (!user) return <div className="p-6"><h2 className="mb-4 font-heading text-lg font-semibold">Log in to your inbox</h2><AccountPanel onAuthenticated={refresh} /></div>;
  return <div className="flex h-full min-h-0 flex-col font-sans text-foreground"><div className="inline-flex gap-1 self-start rounded-full bg-muted p-1 m-4" role="group" aria-label="Inbox sections"><button type="button" className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors', tab === 'messages' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')} aria-pressed={tab === 'messages'} onClick={() => setTab('messages')}>Messages</button><button type="button" className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors', tab === 'requests' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')} aria-pressed={tab === 'requests'} onClick={() => setTab('requests')}>Book requests</button></div>{tab === 'messages' ? <MessageInbox user={user} initialChatId={initialChatId} bookId={bookId} onUpdate={onUpdate} /> : <RequestInbox user={user} onUpdate={onUpdate} />}</div>;
}
