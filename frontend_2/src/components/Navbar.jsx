import { appPath, currentPath } from '../services/paths.js';
import { useEffect, useState } from 'react';
import { BadgeCheck, BookOpen, ChevronsUpDown, Flag, LogIn, LogOut, Menu, UserRound, X } from 'lucide-react';
import InboxLink from './InboxLink.jsx';
import WishlistPopup from './WishlistPopup.jsx';
import BrandAvatar from './BrandAvatar.jsx';
import { useAuth } from '../services/AuthContext.jsx';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const links = [['Home', '/'], ['Browse books', '/books'], ['List a book', '/list-book'], ['Community', '/community']];

// Where "Report an issue" points. A GitHub issue is a sensible default for now;
// swap for a support email or form when one exists.
const REPORT_ISSUE_URL = 'https://github.com/Divyanshu026/BetterReads/issues/new';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, openAuth, requestLogout } = useAuth();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let previous = window.scrollY;
    function onScroll() {
      const current = window.scrollY;
      if (open || document.querySelector('.floating-inbox[open]') || current <= 100 || current < previous - 2) setHidden(false);
      else if (current > previous + 2) setHidden(true);
      previous = current;
    }
    function onKeyDown(event) { if (event.key === 'Escape') setOpen(false); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('keydown', onKeyDown); };
  }, [open]);
  // Broadcast navbar visibility so top-anchored overlays (e.g. toasts) can sit
  // just below it when shown and slide to the top edge when it hides on scroll.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('betterreads:nav-visibility', { detail: { hidden } }));
  }, [hidden]);
  const path = currentPath();
  const active = (href) => href === '/' ? path === '/' : path === href || (href === '/books' && path.startsWith('/books/'));
  const navLinks = (items, className) => items.map(([label, href]) => (
    <a
      key={href}
      href={appPath(href)}
      aria-current={active(href) ? 'page' : undefined}
      className={className}
    >
      {label}
    </a>
  ));

  return (
    <>
      <div aria-hidden="true" className="h-[92px] max-md:h-[76px]" />
      <header className={cn(
        'fixed inset-x-0 top-0 z-50 flex h-[92px] items-center gap-4 border-b border-border/60 bg-background/95 px-8 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.28)] backdrop-blur-md transition-transform duration-300 max-md:h-[76px] max-md:px-4',
        hidden && '-translate-y-full',
      )}>
        <a href={appPath('/')} aria-label="Bettereads home" className="flex items-center gap-2.5">
          <img src={appPath('/betterreads-reader.png')} alt="" className="size-12 rounded-full max-md:size-11" />
          <span className="flex flex-col leading-none">
            <span className="text-[22px] font-extrabold leading-[0.9] tracking-tight text-[#9b3b2a] [font-family:'Barlow_Condensed',sans-serif] max-md:text-xl">BETTEREADS</span>
            <span className="mt-1 text-[8px] font-bold tracking-[0.16em] text-[#5c6450]">BOOKS · NEW BEGINNINGS</span>
          </span>
        </a>

        <nav aria-label="Main navigation" className="ml-6 hidden items-center gap-1 md:flex">
          {navLinks(
            links,
            'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:text-foreground',
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <InboxLink />
          <WishlistPopup />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full pr-2.5 pl-1"
                  aria-label={`Account menu for ${user.username ? `@${user.username}` : user.name || 'your account'}`}
                  aria-current={path.startsWith('/readers') ? 'page' : undefined}
                >
                  <span className="relative shrink-0">
                    <BrandAvatar user={user} className="size-6 border border-background" fallbackClassName="text-[10px]" />
                    {user.emailVerified && <BadgeCheck className="absolute -right-1 -bottom-1 size-3.5 rounded-full bg-background text-emerald-600 dark:text-emerald-400" aria-label="Email verified" />}
                  </span>
                  <span className="max-w-[12ch] truncate text-xs font-medium">{user.username ? `@${user.username}` : user.name || 'Reader'}</span>
                  <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52" sideOffset={8}>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <BrandAvatar user={user} className="size-8" fallbackClassName="text-xs" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{user.name || 'Reader'}</span>
                    {user.username && <span className="truncate text-xs text-muted-foreground">@{user.username}</span>}
                    {user.emailVerified
                      ? <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><BadgeCheck className="size-3.5" aria-hidden="true" /> Verified</span>
                      : <span className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Email not verified</span>}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={appPath('/readers/me')}><UserRound aria-hidden="true" /> Profile</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={REPORT_ISSUE_URL} target="_blank" rel="noopener noreferrer"><Flag aria-hidden="true" /> Report an issue</a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => requestLogout()}>
                  <LogOut aria-hidden="true" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account" className="rounded-full">
                  <UserRound />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44" sideOffset={8}>
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => openAuth('login')}><LogIn aria-hidden="true" /> Log in</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => openAuth('register')}><UserRound aria-hidden="true" /> Sign up</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><a href={appPath('/books')}><BookOpen aria-hidden="true" /> Browse books</a></DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-controls="shared-mobile-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      {open && (
        <nav
          id="shared-mobile-nav"
          aria-label="Mobile navigation"
          className="fixed inset-x-0 top-[72px] z-40 flex flex-col border-b border-border bg-background p-2 shadow-lg md:hidden"
        >
          {navLinks(
            user ? [...links, ['Profile', '/readers/me']] : links,
            'rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted aria-[current=page]:bg-muted',
          )}
          <Separator className="my-1" />
          {user ? (
            <>
              <button type="button" className="rounded-md px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'messages' } })); }}>Messages</button>
              <button type="button" className="rounded-md px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'requests' } })); }}>Notifications & requests</button>
              <button type="button" className="rounded-md px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-wishlist')); }}>Wishlist</button>
              <a href={REPORT_ISSUE_URL} target="_blank" rel="noopener noreferrer" className="rounded-md px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted" onClick={() => setOpen(false)}>Report an issue</a>
              <Separator className="my-1" />
              <button type="button" className="rounded-md px-3 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-muted" onClick={() => { setOpen(false); requestLogout(); }}>Log out</button>
            </>
          ) : (
            <>
              <button type="button" className="rounded-md px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted" onClick={() => { setOpen(false); openAuth('login'); }}>Log in</button>
              <button type="button" className="rounded-md px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted" onClick={() => { setOpen(false); openAuth('register'); }}>Sign up</button>
            </>
          )}
        </nav>
      )}
    </>
  );
}
