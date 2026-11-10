import { appPath } from '../services/paths.js';
import { useEffect, useState } from 'react';
import { Bell, Check, X, Repeat, BookOpen, ShoppingBag, Inbox, Send } from 'lucide-react';
import { api } from '../services/api.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardAction } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

const typeMeta = {
  barter: { label: 'Exchange', icon: Repeat },
  borrow: { label: 'Borrow', icon: BookOpen },
  purchase: { label: 'Purchase', icon: ShoppingBag },
};

const statusVariant = {
  pending: 'secondary',
  accepted: 'default',
  declined: 'destructive',
  cancelled: 'outline',
  returned: 'secondary',
  completed: 'default',
};

function RequestCard({ offer, isIncoming, busy, onUpdate }) {
  const meta = typeMeta[offer.type] || { label: offer.type, icon: Repeat };
  const Icon = meta.icon;
  const title = offer.listingId?.title || 'Unavailable book';
  const offered = offer.offeredBookIds?.map((book) => book.title).filter(Boolean);
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle className="truncate">
            <a className="hover:underline" href={appPath(offer.listingId?._id ? `/books/${offer.listingId._id}` : '/books')}>
              {title}
            </a>
          </CardTitle>
          <p className="truncate text-xs text-muted-foreground">
            {isIncoming
              ? `From ${offer.proposerId?.name || 'Reader'} · Your book`
              : `To ${offer.ownerName ? `${offer.ownerName}` : 'reader'} · Their book`}
          </p>
        </div>
        <CardAction>
          <Badge variant={statusVariant[offer.status] || 'secondary'} className="capitalize">{offer.status}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-foreground">{meta.label}</span>
          {offered?.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">Offered: {offered.join(', ')}</span>
            </>
          )}
        </div>
        {offer.status === 'pending' && isIncoming && (
          <p className="text-xs text-muted-foreground">
            {offer.type === 'barter'
              ? 'Accepting immediately marks both books exchanged.'
              : 'Accepting reserves this book.'}
          </p>
        )}
      </CardContent>
      {(offer.status === 'pending' || (isIncoming && offer.type === 'borrow' && offer.status === 'accepted')) && (
        <CardFooter className="flex flex-wrap gap-2">
          {isIncoming && offer.type === 'borrow' && offer.status === 'accepted' && (
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => onUpdate(offer._id, 'returned')}>
              Confirm return
            </Button>
          )}
          {offer.status === 'pending' && (
            isIncoming ? (
              <>
                <Button size="sm" disabled={!!busy} onClick={() => onUpdate(offer._id, 'accepted')}>
                  <Check data-icon="inline-start" /> Accept
                </Button>
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => onUpdate(offer._id, 'declined')}>
                  <X data-icon="inline-start" /> Decline
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => onUpdate(offer._id, 'cancelled')}>
                Cancel request
              </Button>
            )
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export default function RequestInbox({ user, onUpdate }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const data = await api('/api/offers');
      const enriched = await Promise.all(data.map(async (offer) => {
        if (!offer.listingId?._id || String(offer.listingId.ownerId) === String(user.id)) return offer;
        try {
          const book = await api(`/api/books/${encodeURIComponent(offer.listingId._id)}`);
          return { ...offer, ownerName: book.ownerId?.name };
        } catch { return offer; }
      }));
      setOffers(enriched); setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function update(id, action) {
    setBusy(id); setError(''); setNotice('');
    try {
      await api(
        `/api/offers/${encodeURIComponent(id)}${action === 'returned' ? '/return' : ''}`,
        action === 'returned'
          ? { method: 'PATCH' }
          : action === 'cancelled'
            ? { method: 'DELETE' }
            : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: action }) },
      );
      setOffers((items) => items.map((offer) => offer._id === id ? { ...offer, status: action } : offer));
      setNotice(`Request ${action}.`);
      await load();
      window.dispatchEvent(new Event('betterreads:inbox-change'));
      onUpdate?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  }

  const incoming = offers.filter((offer) => String(offer.listingId?.ownerId) === String(user.id));
  const outgoing = offers.filter((offer) => String(offer.proposerId?._id || offer.proposerId) === String(user.id));
  const incomingPending = incoming.filter((offer) => offer.status === 'pending').length;

  function Section({ title, Icon, list, isIncoming, emptyText }) {
    return (
      <section className="flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="font-heading text-sm font-semibold">{title}</h3>
          {isIncoming && incomingPending > 0 && (
            <Badge variant="destructive" className="tabular-nums">{incomingPending}</Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{list.length}</span>
        </header>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <Card size="sm" key={i}>
                <CardContent className="flex flex-col gap-2 py-1">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !list.length ? (
          <Empty className="gap-3 p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Icon aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>{emptyText}</EmptyTitle>
              <EmptyDescription>Requests you {isIncoming ? 'receive' : 'send'} appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className={cn('grid grid-cols-1 gap-3 @md:grid-cols-2')}>
            {list.map((offer) => (
              <RequestCard key={offer._id} offer={offer} isIncoming={isIncoming} busy={busy} onUpdate={update} />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="@container flex min-h-0 flex-1 flex-col gap-5 p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="size-5" aria-hidden="true" />
          <h2 className="font-heading text-base font-semibold">Book requests</h2>
          {incomingPending > 0 && (
            <Badge variant="destructive" className="tabular-nums">{incomingPending} new</Badge>
          )}
        </div>
      </header>
      {notice && (
        <p role="status" className="rounded-lg border border-border bg-muted px-4 py-2.5 text-sm">{notice}</p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
      )}
      <Section title="Incoming" Icon={Inbox} list={incoming} isIncoming emptyText="No incoming requests" />
      <Separator />
      <Section title="Sent" Icon={Send} list={outgoing} isIncoming={false} emptyText="No sent requests" />
    </div>
  );
}
