import { useEffect, useRef, useState } from 'react';
import { Bell, MessageCircle, X } from 'lucide-react';
import InboxWorkspace from './InboxWorkspace.jsx';
import useInboxSummary from '../services/useInboxSummary.js';
import { Button } from '@/components/ui/button';

const countBadge = 'absolute -top-0.5 -right-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white';

export default function InboxLink() {
  const [tab, setTab] = useState(null); const [context, setContext] = useState({}); const dialog = useRef(null); const opener = useRef(null);
  const { unread, pending, refresh } = useInboxSummary();
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.has('openInbox')) { setContext({ chatId: params.get('chat'), bookId: params.get('book') }); setTab(params.get('tab') === 'requests' ? 'requests' : 'messages'); params.delete('openInbox'); params.delete('chat'); params.delete('book'); params.delete('tab'); const query = params.toString(); window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash); } }, []);
  useEffect(() => { if (tab && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [tab]);
  useEffect(() => { const show = (event) => { opener.current = document.activeElement; setContext(event.detail || {}); setTab(event.detail?.tab || 'messages'); }; window.addEventListener('betterreads:open-inbox', show); return () => window.removeEventListener('betterreads:open-inbox', show); }, []);
  function open(event, next) { opener.current = event.currentTarget; setContext({}); setTab(next); refresh(); }
  function close() { if (dialog.current?.open) dialog.current.close(); setTab(null); opener.current?.focus(); refresh(); }
  function onBackdropClick(event) { if (event.target === dialog.current) close(); }
  return <div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon" className="relative rounded-full" onClick={(event) => open(event, 'messages')} aria-label={`Messages${unread !== null ? `, ${unread} unread` : ''}`} title="Messages"><MessageCircle aria-hidden="true" />{unread > 0 && <span className={countBadge}>{unread > 99 ? '99+' : unread}</span>}</Button><Button type="button" variant="ghost" size="icon" className="relative rounded-full" onClick={(event) => open(event, 'requests')} aria-label={`Book requests${pending !== null ? `, ${pending} pending incoming` : ''}`} title="Book requests"><Bell aria-hidden="true" />{pending > 0 && <span className={countBadge}>{pending > 99 ? '99+' : pending}</span>}</Button>{tab && <dialog ref={dialog} onClick={onBackdropClick} className="fixed inset-[92px_22px_auto_auto] m-0 h-[min(650px,calc(100dvh-110px))] w-[min(920px,calc(100vw-32px))] max-h-none max-w-none overflow-hidden rounded-xl bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/40 open:flex open:flex-col font-sans max-[560px]:inset-2 max-[560px]:size-auto" aria-labelledby="floating-inbox-title" onCancel={(event) => { event.preventDefault(); close(); }}><header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5"><h2 id="floating-inbox-title" className="font-heading text-xl font-semibold">Your inbox</h2><button type="button" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" onClick={close} aria-label="Close inbox"><X size={20} /></button></header><div className="min-h-0 flex-1 overflow-y-auto"><InboxWorkspace key={`${tab}-${context.chatId || ""}-${context.bookId || ""}`} initialTab={tab} initialChatId={context.chatId} bookId={context.bookId} onUpdate={refresh} /></div></dialog>}</div>;
}
