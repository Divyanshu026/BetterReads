import PageShell from './components/PageShell.jsx';
import InboxWorkspace from './components/InboxWorkspace.jsx';
export default function InboxPage() {
  const params = new URLSearchParams(window.location.search);
  return <PageShell><main className="social-page inbox-page"><span className="eyebrow">STAY CONNECTED</span><h1>Your inbox.</h1><p>Conversations and exchange requests in one place.</p><InboxWorkspace initialTab={params.get('tab') === 'requests' ? 'requests' : 'messages'} initialChatId={params.get('chat')} bookId={params.get('book')} /></main></PageShell>;
}
