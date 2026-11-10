import PageShell from './components/PageShell.jsx';
import InboxWorkspace from './components/InboxWorkspace.jsx';
export default function InboxPage() {
  const params = new URLSearchParams(window.location.search);
  return <PageShell><main className="mx-auto max-w-[1080px] px-6 py-8 font-sans text-foreground max-sm:px-4 max-sm:py-6"><span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Stay connected</span><h1 className="font-heading text-4xl font-bold tracking-tight max-sm:text-3xl">Your inbox.</h1><p className="mt-1 text-sm text-muted-foreground">Conversations and exchange requests in one place.</p><div className="mt-6 overflow-hidden rounded-xl ring-1 ring-foreground/10"><InboxWorkspace initialTab={params.get('tab') === 'requests' ? 'requests' : 'messages'} initialChatId={params.get('chat')} bookId={params.get('book')} /></div></main></PageShell>;
}
