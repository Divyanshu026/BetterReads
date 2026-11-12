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
import VerifyEmailPage from './VerifyEmailPage.jsx';
import ResetPasswordPage from './ResetPasswordPage.jsx';
import { AuthProvider } from './services/AuthContext.jsx';
import { Toaster } from '@/components/ui/sonner';

const path = currentPath().replace(/\/$/, '');

// Direct login/signup links keep working by opening the shared auth modal in
// the right mode over the home page, instead of a dedicated login page.
let initialAuth = null;
if (path === '/login' || path === '/forgot-password') initialAuth = 'login';
else if (path === '/signup' || path === '/register') initialAuth = 'register';

let page = <App />;
if (initialAuth) page = <App />;
else if (path === '/verify-email') page = <VerifyEmailPage />;
else if (path === '/reset-password') page = <ResetPasswordPage />;
else if (path === '/list-book') page = <ListingPage />;
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

// Normalize /login and /signup to the home URL so a refresh doesn't re-trigger.
if (initialAuth) window.history.replaceState(null, '', appPath('/'));

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider initialAuth={initialAuth}>
      {page}
      <Toaster position="bottom-right" richColors closeButton />
    </AuthProvider>
  </React.StrictMode>,
);
