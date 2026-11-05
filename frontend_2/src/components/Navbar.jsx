import { appPath, currentPath } from '../services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { Heart, Menu, UserRound, X } from 'lucide-react';
import InboxLink from './InboxLink.jsx';
import useReader from '../services/useReader.js';
import { photoUrl } from '../services/api.js';

const links = [['Home', '/'], ['Browse books', '/books'], ['List a book', '/list-book'], ['Community', '/community']];
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useReader();
  const navRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
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
  const navLinks = (items) => items.map(([label, href]) => <a key={href} href={appPath(href)} aria-current={active(href) ? 'page' : undefined}>{label}</a>);
  function moveIndicator(link) {
    if (!link || !navRef.current) { setIndicator({ left: 0, width: 0 }); return; }
    const navBox = navRef.current.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    setIndicator({ left: linkBox.left - navBox.left + 14, width: Math.max(0, linkBox.width - 28) });
  }
  function resetIndicator() { moveIndicator(navRef.current?.querySelector('[aria-current=page]')); }
  useEffect(() => {
    resetIndicator();
    window.addEventListener('resize', resetIndicator);
    return () => window.removeEventListener('resize', resetIndicator);
  }, []);
  return <><div className="shared-navbar-spacer" aria-hidden="true" /><header className={`shared-navbar ${hidden ? 'shared-navbar-hidden' : ''}`}>
    <a className="brand" href={appPath('/')} aria-label="BetterReads home"><img className="brand-icon" src={appPath('/betterreads-reader.png')} alt="" /><span className="brand-name">BETTERREADS<small>BOOKS · NEW BEGINNINGS</small></span></a>
    <nav ref={navRef} className="shared-nav-links" aria-label="Main navigation" onMouseLeave={resetIndicator} onMouseOver={(event) => { const link = event.target.closest('a'); if (link) moveIndicator(link); }} onFocus={(event) => { if (event.target.matches('a')) moveIndicator(event.target); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) resetIndicator(); }}>{navLinks(links)}<span className="shared-nav-indicator" aria-hidden="true" style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width, opacity: indicator.width ? 1 : 0 }} /></nav>
    <div className="shared-nav-actions"><InboxLink /><a className="header-icon-button" href={appPath('/wishlist')} aria-label="Wishlist" title="Wishlist" aria-current={active('/wishlist') ? 'page' : undefined}><Heart size={19} /></a><a className="header-icon-button" href={appPath('/readers/me')} aria-label="Profile" title="Profile" aria-current={path.startsWith('/readers') ? 'page' : undefined}>{user?.avatarUrl ? <img className="navbar-profile-avatar" src={photoUrl(user.avatarUrl)} alt="" /> : <UserRound size={19} />}</a><button type="button" className="shared-menu-toggle" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} aria-controls="shared-mobile-nav" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button></div>
    {open && <nav id="shared-mobile-nav" className="shared-mobile-nav" aria-label="Mobile navigation">{navLinks([...links, ['Wishlist', '/wishlist'], ['Profile', '/readers/me']])}<button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'messages' } })); }}>Messages</button><button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'requests' } })); }}>Notifications & requests</button></nav>}
  </header></>;
}
