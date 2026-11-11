import { useState } from 'react';
import MessageInbox from './MessageInbox.jsx';
import RequestInbox from './RequestInbox.jsx';
import { useAuth } from '../services/AuthContext.jsx';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function InboxWorkspace({ initialTab = 'messages', initialChatId, bookId, onUpdate }) {
  const { user, loading, error, refresh, openAuth } = useAuth();
  const [tab, setTab] = useState(initialTab);
  if (loading) return <p role="status" className="p-6 text-sm text-muted-foreground">Loading your account…</p>;
  if (error && !user) return <div role="alert" className="flex flex-col items-start gap-3 p-6"><p className="text-sm text-muted-foreground">{error}</p><Button variant="outline" size="sm" onClick={refresh}>Try again</Button></div>;
  if (!user) return <div className="flex flex-col items-start gap-3 p-6"><h2 className="font-heading text-lg font-semibold">Log in to your inbox</h2><p className="text-sm text-muted-foreground">Your messages and book requests are tied to your account.</p><Button onClick={() => openAuth('login', 'Log in to see your messages and requests.')}>Log in or sign up</Button></div>;
  return <div className="flex h-full min-h-0 flex-col font-sans text-foreground"><div className="inline-flex gap-1 self-start rounded-full bg-muted p-1 m-4" role="group" aria-label="Inbox sections"><button type="button" className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors', tab === 'messages' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')} aria-pressed={tab === 'messages'} onClick={() => setTab('messages')}>Messages</button><button type="button" className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors', tab === 'requests' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')} aria-pressed={tab === 'requests'} onClick={() => setTab('requests')}>Book requests</button></div>{tab === 'messages' ? <MessageInbox user={user} initialChatId={initialChatId} bookId={bookId} onUpdate={onUpdate} /> : <RequestInbox user={user} onUpdate={onUpdate} />}</div>;
}
