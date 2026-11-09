import { appPath, currentPath } from '../services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { Bell, BookOpen, Heart, LogIn, LogOut, Menu, MessageCircle, UserRound, X } from 'lucide-react';
import InboxLink from './InboxLink.jsx';
import useReader from '../services/useReader.js';
import { photoUrl } from '../services/api.js';
import { clearToken } from '../services/auth.js';

const links = [['Home', '/'], ['Browse books', '/books'], ['List a book', '/list-book'], ['Community', '/community']];
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user } = useReader();
  const navRef = useRef(null);
  const profileRef = useRef(null);
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
    function onKeyDown(event) { if (event.key === 'Escape') { setOpen(false); setProfileOpen(false); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('keydown', onKeyDown); };
  }, [open]);
  useEffect(() => {
    if (!profileOpen) return undefined;
    function onPointerDown(event) { if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false); }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [profileOpen]);
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
    <div className="shared-nav-actions"><InboxLink /><a className="header-icon-button" href={appPath('/wishlist')} aria-label="Wishlist" title="Wishlist" aria-current={active('/wishlist') ? 'page' : undefined}><Heart size={19} /></a><div className="profile-menu" ref={profileRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false); }}><button type="button" className="header-icon-button" aria-label={user ? 'Account menu' : 'Log in or sign up'} title={user ? 'Account' : 'Log in'} aria-haspopup="menu" aria-expanded={profileOpen} aria-current={path.startsWith('/readers') ? 'page' : undefined} onClick={() => setProfileOpen((value) => !value)}>{user?.avatarUrl ? <img className="navbar-profile-avatar" src={photoUrl(user.avatarUrl)} alt="" /> : <UserRound size={19} />}</button>{profileOpen && <div className="profile-menu-popover" role="menu">{user ? <>
      <div className="profile-menu-identity"><strong>{user.name || 'Reader'}</strong>{user.email && <span>{user.email}</span>}</div>
      <a role="menuitem" href={appPath('/readers/me')}><UserRound size={16} aria-hidden="true" /> View profile</a>
      <a role="menuitem" href={appPath('/wishlist')}><Heart size={16} aria-hidden="true" /> Wishlist</a>
      <button role="menuitem" type="button" onClick={() => { setProfileOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'messages' } })); }}><MessageCircle size={16} aria-hidden="true" /> Messages</button>
      <button role="menuitem" type="button" onClick={() => { setProfileOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'requests' } })); }}><Bell size={16} aria-hidden="true" /> Notifications &amp; requests</button>
      <button role="menuitem" type="button" className="profile-menu-signout" onClick={() => { clearToken(); setProfileOpen(false); }}><LogOut size={16} aria-hidden="true" /> Log out</button>
    </> : <>
      <div className="profile-menu-identity"><strong>Welcome to BetterReads</strong><span>Log in to list, save, and exchange books.</span></div>
      <a role="menuitem" className="profile-menu-primary" href={appPath('/readers/me')}><LogIn size={16} aria-hidden="true" /> Log in or sign up</a>
      <a role="menuitem" href={appPath('/books')}><BookOpen size={16} aria-hidden="true" /> Browse books</a>
    </>}</div>}</div><button type="button" className="shared-menu-toggle" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} aria-controls="shared-mobile-nav" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button></div>
    {open && <nav id="shared-mobile-nav" className="shared-mobile-nav" aria-label="Mobile navigation">{navLinks([...links, ['Wishlist', '/wishlist'], ['Profile', '/readers/me']])}<button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'messages' } })); }}>Messages</button><button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'requests' } })); }}>Notifications & requests</button></nav>}
  </header></>;
}
