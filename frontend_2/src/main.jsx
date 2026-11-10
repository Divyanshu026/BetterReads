import './index.css';
import { appPath, currentPath } from './services/paths.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ListingPage from './ListingPage.jsx';
import BookDetailPage from './BookDetailPage.jsx';
import CatalogPage from './CatalogPage.jsx';
import CommunityPage from './CommunityPage.jsx';
import ReaderProfilePage from './ReaderProfilePage.jsx';
import DashboardPage from './DashboardPage.jsx';
import { Toaster } from '@/components/ui/sonner';

const path = currentPath().replace(/\/$/, '');
let page = <App />;
if (path === '/list-book') page = <ListingPage />;
else if (path === '/books') page = <CatalogPage />;
else if (path === '/wishlist') { const params = new URLSearchParams(window.location.search); params.set('openWishlist', '1'); window.location.replace(`${appPath('/')}?${params}`); }
else if (path === '/inbox') { const params = new URLSearchParams(window.location.search); params.set('openInbox', '1'); window.location.replace(`${appPath('/')}?${params}`); }
else if (path === '/community') page = <CommunityPage />;
else if (path === '/dashboard') page = <DashboardPage />;
else if (path === '/readers/me') page = <DashboardPage />;
else if (/^\/readers\/[a-f\d]{24}$/i.test(path)) page = <ReaderProfilePage readerId={path.slice('/readers/'.length)} />;
else if (/^\/books\/[a-f\d]{24}$/i.test(path)) {
  page = <BookDetailPage id={path.slice('/books/'.length)} />;
}
createRoot(document.getElementById('root')).render(<React.StrictMode>{page}<Toaster position="bottom-right" richColors closeButton /></React.StrictMode>);


