import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ListingPage from './ListingPage.jsx';
import BookDetailPage from './BookDetailPage.jsx';
import CatalogPage from './CatalogPage.jsx';
import WishlistPage from './WishlistPage.jsx';
import InboxPage from './InboxPage.jsx';
import CommunityPage from './CommunityPage.jsx';
import ReaderProfilePage from './ReaderProfilePage.jsx';

const path = window.location.pathname.replace(/\/$/, '');
let page = <App />;
if (path === '/list-book') page = <ListingPage />;
else if (path === '/books') page = <CatalogPage />;
else if (path === '/wishlist') page = <WishlistPage />;
else if (path === '/inbox') page = <InboxPage />;
else if (path === '/community') page = <CommunityPage />;
else if (path === '/readers/me') page = <ReaderProfilePage mine />;
else if (/^\/readers\/[a-f\d]{24}$/i.test(path)) page = <ReaderProfilePage readerId={path.slice('/readers/'.length)} />;
else if (path.startsWith('/books/example/')) {
  let title = '';
  try { title = decodeURIComponent(path.slice('/books/example/'.length)); } catch { /* Invalid title shows not found. */ }
  page = <BookDetailPage exampleTitle={title || '\u0000'} />;
} else if (/^\/books\/[a-f\d]{24}$/i.test(path)) {
  page = <BookDetailPage id={path.slice('/books/'.length)} />;
} else if (path.startsWith('/books/')) page = <BookDetailPage exampleTitle="\u0000" />;
createRoot(document.getElementById('root')).render(<React.StrictMode>{page}</React.StrictMode>);


