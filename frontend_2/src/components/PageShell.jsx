import InboxLink from './InboxLink.jsx';
import { ArrowLeft } from 'lucide-react';
export default function PageShell({ children }) {
  return <div className="catalog-page"><header className="listing-page-header"><a className="brand" href="/" aria-label="BetterReads home"><img className="brand-icon" src="/betterreads-reader.png" alt="" /><span className="brand-name">BETTERREADS<small>BOOKS · NEW BEGINNINGS</small></span></a><nav className="subpage-nav"><a href="/books">Books</a><a href="/community">Community</a><a href="/wishlist">Wishlist</a><InboxLink /><a className="listing-back" href="/"><ArrowLeft size={16} /> Home</a></nav></header>{children}</div>;
}

