import { useEffect, useRef, useState } from 'react';
import { Bell, MessageCircle, X } from 'lucide-react';
import InboxWorkspace from './InboxWorkspace.jsx';
import useInboxSummary from '../services/useInboxSummary.js';

export default function InboxLink() {
  const [tab, setTab] = useState(null); const [context, setContext] = useState({}); const dialog = useRef(null); const opener = useRef(null);
  const { unread, pending, refresh } = useInboxSummary();
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.has('openInbox')) { setContext({ chatId: params.get('chat'), bookId: params.get('book') }); setTab(params.get('tab') === 'requests' ? 'requests' : 'messages'); params.delete('openInbox'); params.delete('chat'); params.delete('book'); params.delete('tab'); const query = params.toString(); window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash); } }, []);
  useEffect(() => { if (tab && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [tab]);
  useEffect(() => { const show = (event) => { opener.current = document.activeElement; setContext(event.detail || {}); setTab(event.detail?.tab || 'messages'); }; window.addEventListener('betterreads:open-inbox', show); return () => window.removeEventListener('betterreads:open-inbox', show); }, []);
  function open(event, next) { opener.current = event.currentTarget; setContext({}); setTab(next); refresh(); }
  function close() { if (dialog.current?.open) dialog.current.close(); setTab(null); opener.current?.focus(); refresh(); }
  return <div className="inbox-nav-controls"><button type="button" className="header-icon-button inbox-link" onClick={(event) => open(event, 'messages')} aria-label={`Messages${unread !== null ? `, ${unread} unread` : ''}`} title="Messages"><MessageCircle size={19} aria-hidden="true" />{unread > 0 && <span>{unread > 99 ? '99+' : unread}</span>}</button><button type="button" className="header-icon-button request-link" onClick={(event) => open(event, 'requests')} aria-label={`Book requests${pending !== null ? `, ${pending} pending incoming` : ''}`} title="Book requests"><Bell size={19} aria-hidden="true" />{pending > 0 && <span>{pending > 99 ? '99+' : pending}</span>}</button>{tab && <dialog ref={dialog} className="floating-inbox" aria-labelledby="floating-inbox-title" onCancel={(event) => { event.preventDefault(); close(); }}><header className="floating-inbox-header"><h2 id="floating-inbox-title">Your inbox</h2><div><button type="button" onClick={close} aria-label="Close inbox"><X size={20} /></button></div></header><InboxWorkspace key={`${tab}-${context.chatId || ""}-${context.bookId || ""}`} initialTab={tab} initialChatId={context.chatId} bookId={context.bookId} onUpdate={refresh} /></dialog>}</div>;
}
