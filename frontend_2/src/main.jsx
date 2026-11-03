import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ListingPage from './ListingPage.jsx';
import BookDetailPage from './BookDetailPage.jsx';
import CatalogPage from './CatalogPage.jsx';

const path = window.location.pathname.replace(/\/$/, '');
let page = <App />;
if (path === '/list-book') page = <ListingPage />;
else if (path === '/books') page = <CatalogPage />;
else if (path.startsWith('/books/example/')) {
  let title = '';
  try { title = decodeURIComponent(path.slice('/books/example/'.length)); } catch { /* Invalid title shows not found. */ }
  page = <BookDetailPage exampleTitle={title || '\u0000'} />;
} else if (/^\/books\/[a-f\d]{24}$/i.test(path)) {
  page = <BookDetailPage id={path.slice('/books/'.length)} />;
} else if (path.startsWith('/books/')) page = <BookDetailPage exampleTitle="\u0000" />;
createRoot(document.getElementById('root')).render(<React.StrictMode>{page}</React.StrictMode>);


