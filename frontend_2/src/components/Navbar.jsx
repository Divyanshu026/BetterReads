import { appPath, currentPath } from '../services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, LogIn, LogOut, Menu, UserRound, X } from 'lucide-react';
import InboxLink from './InboxLink.jsx';
import WishlistPopup from './WishlistPopup.jsx';
import useReader from '../services/useReader.js';
import { photoUrl } from '../services/api.js';
import { clearToken } from '../services/auth.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const links = [['Home', '/'], ['Browse books', '/books'], ['List a book', '/list-book'], ['Community', '/community']];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useReader();
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
        'fixed inset-x-0 top-0 z-50 flex h-[92px] items-center gap-4 border-b border-border bg-background/95 px-8 backdrop-blur-md transition-transform duration-300 max-md:h-[76px] max-md:px-4',
        hidden && '-translate-y-full',
      )}>
        <a href={appPath('/')} aria-label="BetterReads home" className="flex items-center gap-2.5">
          <img src={appPath('/betterreads-reader.png')} alt="" className="size-12 rounded-full max-md:size-11" />
          <span className="flex flex-col leading-none">
            <span className="text-[22px] font-extrabold leading-[0.9] tracking-tight text-[#9b3b2a] [font-family:'Barlow_Condensed',sans-serif] max-md:text-xl">BETTERREADS</span>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={user ? 'Account menu' : 'Log in or sign up'}
                aria-current={path.startsWith('/readers') ? 'page' : undefined}
                className="rounded-full"
              >
                {user?.avatarUrl
                  ? <img src={photoUrl(user.avatarUrl)} alt="" className="size-7 rounded-full object-cover" />
                  : <UserRound />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-25">
              {user ? (
                <>
                  <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold">
                      {user.avatarUrl ? <img src={photoUrl(user.avatarUrl)} alt="" className="size-full object-cover" /> : (user.name || 'R').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{user.name || 'Reader'}</span>
                      {user.email && <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><a href={appPath('/readers/me')}><UserRound /> View profile</a></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => clearToken()}><LogOut /> Log out</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="font-medium">Welcome to BetterReads</span>
                    <span className="text-xs font-normal text-muted-foreground">Log in to list, save, and exchange books.</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild><a href={appPath('/readers/me')}><LogIn /> Log in or sign up</a></DropdownMenuItem>
                    <DropdownMenuItem asChild><a href={appPath('/books')}><BookOpen /> Browse books</a></DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
            [...links, ['Profile', '/readers/me']],
            'rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted aria-[current=page]:bg-muted',
          )}
          <Separator className="my-1" />
          <button type="button" className="rounded-md px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'messages' } })); }}>Messages</button>
          <button type="button" className="rounded-md px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'requests' } })); }}>Notifications & requests</button>
          <button type="button" className="rounded-md px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-wishlist')); }}>Wishlist</button>
        </nav>
      )}
    </>
  );
}
