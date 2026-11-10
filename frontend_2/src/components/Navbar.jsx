import { appPath, currentPath } from '../services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronsUpDown, LogIn, LogOut, Menu, UserRound, X } from 'lucide-react';
import InboxLink from './InboxLink.jsx';
import WishlistPopup from './WishlistPopup.jsx';
import useReader from '../services/useReader.js';
import { clearToken } from '../services/auth.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const links = [['Home', '/'], ['Browse books', '/books'], ['List a book', '/list-book'], ['Community', '/community']];

const avatarFor = (user) => {
  const seed = encodeURIComponent(String(user?.id || user?.email || user?.name || 'reader'));
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}&backgroundColor=1e293b,0f172a,334155,27272a,18181b&shapeColor=f1f5f9,e2e8f0,cbd5e1,fef3c7`;
};

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
        'fixed inset-x-0 top-0 z-50 flex h-[92px] items-center gap-4 border-b border-border/60 bg-background/95 px-8 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] backdrop-blur-md transition-transform duration-300 max-md:h-[76px] max-md:px-4',
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
              {user ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full pr-2.5 pl-1"
                  aria-label="Account menu"
                  aria-current={path.startsWith('/readers') ? 'page' : undefined}
                >
                  <Avatar className="size-6 border border-background">
                    <AvatarImage src={avatarFor(user)} alt="" />
                    <AvatarFallback>{(user.name || 'R').slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="max-w-[10ch] truncate text-xs font-medium">{user.name || 'Reader'}</span>
                  <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Log in or sign up"
                  className="rounded-full"
                >
                  <UserRound />
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" sideOffset={8}>
              {user ? (
                <>
                  <DropdownMenuItem asChild>
                    <a href={appPath('/readers/me')}><UserRound aria-hidden="true" /> Profile</a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => clearToken()}>
                    <LogOut aria-hidden="true" /> Log out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild><a href={appPath('/readers/me')}><LogIn /> Log in or sign up</a></DropdownMenuItem>
                  <DropdownMenuItem asChild><a href={appPath('/books')}><BookOpen /> Browse books</a></DropdownMenuItem>
                </DropdownMenuGroup>
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
