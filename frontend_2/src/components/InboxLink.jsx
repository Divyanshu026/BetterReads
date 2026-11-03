import { useEffect, useRef, useState } from 'react';
import { Bell, MessageCircle, X } from 'lucide-react';
import InboxWorkspace from './InboxWorkspace.jsx';
import useInboxSummary from '../services/useInboxSummary.js';

export default function InboxLink() {
  const [tab, setTab] = useState(null); const dialog = useRef(null); const opener = useRef(null);
  const { unread, pending, refresh } = useInboxSummary();
  useEffect(() => { if (tab && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [tab]);
  function open(event, next) { opener.current = event.currentTarget; setTab(next); refresh(); }
  function close() { if (dialog.current?.open) dialog.current.close(); setTab(null); opener.current?.focus(); refresh(); }
  return <div className="inbox-nav-controls"><button type="button" className="header-icon-button inbox-link" onClick={(event) => open(event, 'messages')} aria-label={`Messages${unread !== null ? `, ${unread} unread` : ''}`} title="Messages"><MessageCircle size={19} aria-hidden="true" />{unread > 0 && <span>{unread > 99 ? '99+' : unread}</span>}</button><button type="button" className="header-icon-button request-link" onClick={(event) => open(event, 'requests')} aria-label={`Book requests${pending !== null ? `, ${pending} pending incoming` : ''}`} title="Book requests"><Bell size={19} aria-hidden="true" />{pending > 0 && <span>{pending > 99 ? '99+' : pending}</span>}</button>{tab && <dialog ref={dialog} className="floating-inbox" aria-labelledby="floating-inbox-title" onCancel={(event) => { event.preventDefault(); close(); }}><header className="floating-inbox-header"><h2 id="floating-inbox-title">Your inbox</h2><div><a href={tab === 'requests' ? '/inbox?tab=requests' : '/inbox'}>Open page</a><button type="button" onClick={close} aria-label="Close inbox"><X size={20} /></button></div></header><InboxWorkspace key={tab} initialTab={tab} onUpdate={refresh} /></dialog>}</div>;
}
