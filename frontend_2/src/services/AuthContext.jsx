import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { LogOut, X } from 'lucide-react';
import { apiBase, getCurrentUser } from './api.js';
import { appPath } from './paths.js';
import { isSignedIn, markSignedOut } from './auth.js';
import AuthModal from '../components/AuthModal.jsx';
import VerifyCodeModal from '../components/VerifyCodeModal.jsx';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/reui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const AuthContext = createContext(null);

// A single app-wide auth provider: it owns the current user, the shared auth
// modal, and a `requireAuth(action)` gate that opens the modal for guests and
// resumes the pending action after a successful sign-in (and onboarding).
//
// Mount this once near the root. Every page reads it through useAuth().
export function AuthProvider({ children, initialAuth = null }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => isSignedIn());
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  // Modal state. `step` is 'auth' (login/signup) or 'onboarding' (username).
  const [modal, setModal] = useState({ open: false, mode: 'login', step: 'auth', prompt: '', user: null });
  // Separate open state for the typed-code email verification modal.
  const [verifyCodeOpen, setVerifyCodeOpen] = useState(false);
  // Open state for the "are you sure you want to log out?" confirmation.
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const pendingAction = useRef(null);

  // Direct /login and /signup links open the shared modal in the right mode,
  // unless the visitor is already signed in.
  useEffect(() => {
    if (!initialAuth || isSignedIn()) return;
    setModal({ open: true, mode: initialAuth === 'register' ? 'register' : 'login', step: 'auth', prompt: '', user: null });
  }, [initialAuth]);

  // Load / refresh the current user whenever the session changes. The session
  // lives in an httpOnly cookie now, so we go by the local "signed in" hint and
  // let /api/auth/me (with its silent refresh-retry) be the real authority.
  useEffect(() => {
    let active = true;
    if (!isSignedIn()) { setUser(null); setLoading(false); setError(''); return () => { active = false; }; }
    setLoading(true);
    setError('');
    getCurrentUser()
      .then((data) => { if (active) setUser(data.user); })
      .catch((err) => {
        if (!active) return;
        if (err.status === 401) { markSignedOut(); setUser(null); setError(''); }
        else setError(err.status === 429 ? 'Too many requests. Please wait a few minutes and try again.' : 'Unable to check your account. Check that the backend is running and try again.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);

  const refresh = useCallback(() => setVersion((n) => n + 1), []);

  // Cross-tab / cross-component auth changes (login elsewhere, logout, profile edits).
  useEffect(() => {
    const changed = () => refresh();
    window.addEventListener('betterreads:auth-change', changed);
    window.addEventListener('betterreads:profile-change', changed);
    return () => {
      window.removeEventListener('betterreads:auth-change', changed);
      window.removeEventListener('betterreads:profile-change', changed);
    };
  }, [refresh]);

  const closeModal = useCallback(() => {
    setModal((current) => ({ ...current, open: false }));
    pendingAction.current = null;
  }, []);

  // Open the shared modal in login or signup mode. Returns nothing; use
  // requireAuth when you want an action resumed afterwards.
  const openAuth = useCallback((mode = 'login', prompt = '') => {
    setModal({ open: true, mode: mode === 'register' ? 'register' : 'login', step: 'auth', prompt, user: null });
  }, []);

  // Finish a successful authentication: store user, run onboarding if the
  // account is new and still lacks a username, otherwise resume any pending
  // action and close.
  const finish = useCallback((authedUser) => {
    setUser(authedUser);
    const action = pendingAction.current;
    pendingAction.current = null;
    setModal((current) => ({ ...current, open: false }));
    if (typeof action === 'function') {
      // Defer so the modal close and state update settle first.
      window.setTimeout(() => { try { action(authedUser); } catch { /* ignore */ } }, 0);
    } else {
      // No action to resume: gently nudge the reader to round out their profile.
      // Only on an actual sign-in (this runs from the auth/onboarding steps, not
      // on token refresh), and skippable.
      promptProfileCompletion();
    }
  }, []);

  // A one-time, dismissible prompt after sign-in inviting the reader to fill out
  // their profile. "Complete profile" opens the dashboard editor; "Skip for now"
  // just closes it. Not shown while the dashboard editor is already on screen.
  const promptProfileCompletion = useCallback(() => {
    if (window.location.pathname.replace(/\/$/, '').endsWith('/dashboard')) return;
    window.setTimeout(() => {
      // A fully custom card so the title, description, and actions lay out
      // cleanly (sonner's default action layout cramps them) and stay on the
      // warm palette — brand-red primary button, neutral card, no green.
      toast.custom((id) => (
        <div className="flex w-[380px] max-w-[calc(100vw-32px)] items-center gap-3 rounded-xl border border-border bg-popover px-3.5 py-2.5 text-popover-foreground shadow-lg">
          <div className="flex min-w-0 flex-1 flex-col">
            <strong className="text-sm font-semibold leading-tight">Complete your profile</strong>
            <p className="truncate text-xs text-muted-foreground">Add a photo, bio, and city to get noticed.</p>
          </div>
          <Button size="sm" className="h-7 shrink-0 px-2.5 text-xs" onClick={() => { toast.dismiss(id); window.location.assign(`${appPath('/dashboard')}?edit=1`); }}>Complete</Button>
          <button
            type="button"
            aria-label="Skip for now"
            onClick={() => toast.dismiss(id)}
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ), {
        id: 'complete-profile',
        duration: 10000,
      });
    }, 400);
  }, []);

  // Called by the modal's auth step with the server payload.
  const handleAuthenticated = useCallback((data) => {
    const needsOnboarding = data.created && !data.user?.username;
    setUser(data.user);
    if (needsOnboarding) {
      setModal((current) => ({ ...current, open: true, step: 'onboarding', user: data.user }));
    } else {
      finish(data.user);
    }
  }, [finish]);

  // Called by the onboarding step once a username is saved.
  const handleOnboarded = useCallback((updatedUser) => {
    window.dispatchEvent(new Event('betterreads:profile-change'));
    finish(updatedUser);
  }, [finish]);

  const onOpenChange = useCallback((next) => {
    if (next) return;
    // Don't allow dismissing the required onboarding step.
    setModal((current) => (current.step === 'onboarding' ? current : { ...current, open: false }));
    if (modal.step !== 'onboarding') pendingAction.current = null;
  }, [modal.step]);

  // The gate. If signed in, run `action` now. Otherwise remember it, open the
  // modal, and run it after a successful sign-in (and onboarding).
  const requireAuth = useCallback((action, { mode = 'login', prompt = '' } = {}) => {
    if (user) { if (typeof action === 'function') action(user); return true; }
    pendingAction.current = typeof action === 'function' ? action : null;
    setModal({ open: true, mode: mode === 'register' ? 'register' : 'login', step: 'auth', prompt, user: null });
    return false;
  }, [user]);

  // Revoke the session server-side (best-effort — clear locally regardless so
  // the UI never gets stuck signed in), then clear the local hint.
  // Perform the actual sign-out. Lands on /login, which renders the home page
  // with the login popup open, so the signed-out user never sits on a now-empty
  // protected view and has a clear way back in.
  const logout = useCallback(() => {
    fetch(`${apiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    markSignedOut();
    setUser(null);
    setError('');
    window.location.assign(appPath('/login'));
  }, []);

  // Open the "are you sure?" confirmation before logging out. Call sites use
  // this; the dialog's confirm button runs logout().
  const requestLogout = useCallback(() => setLogoutConfirmOpen(true), []);

  // Ask the server to re-send the verification email for the signed-in account.
  const resendVerification = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/auth/resend-verification`, { method: 'POST', credentials: 'include' });
    if (!response.ok) {
      const message = response.status === 429
        ? 'Too many requests. Please wait a few minutes and try again.'
        : 'Could not resend the verification email. Please try again.';
      throw new Error(message);
    }
  }, []);

  // Open the typed-code verification modal (it sends a fresh code on open).
  const openVerifyCode = useCallback(() => setVerifyCodeOpen(true), []);

  // Apply a successful code verification: update the user and close the modal.
  const handleCodeVerified = useCallback((updatedUser) => {
    if (updatedUser) setUser(updatedUser);
    window.dispatchEvent(new Event('betterreads:profile-change'));
    setVerifyCodeOpen(false);
    toast.success('Email verified. You now have full access.');
  }, []);

  // Prompt the user to verify their email, with a one-click "Verify email"
  // action that opens the code modal. Called both directly and in response to a
  // blocked (403 EMAIL_NOT_VERIFIED) action anywhere in the app.
  const promptVerification = useCallback((description) => {
    toast.warning('Verify your email to continue', {
      id: 'needs-verification', // dedupe rapid repeats
      description: description || 'This action needs a verified email address.',
      action: { label: 'Verify email', onClick: () => setVerifyCodeOpen(true) },
    });
  }, []);

  // One central listener: any gated action that the server rejects as
  // unverified surfaces the same prompt, so no call site needs its own handling.
  useEffect(() => {
    const onNeeds = () => promptVerification();
    window.addEventListener('betterreads:needs-verification', onNeeds);
    return () => window.removeEventListener('betterreads:needs-verification', onNeeds);
  }, [promptVerification]);

  const value = useMemo(
    () => ({ user, loading, error, refresh, requireAuth, openAuth, closeModal, logout, requestLogout, resendVerification, promptVerification, openVerifyCode }),
    [user, loading, error, refresh, requireAuth, openAuth, closeModal, logout, requestLogout, resendVerification, promptVerification, openVerifyCode],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        open={modal.open}
        mode={modal.mode}
        step={modal.step}
        user={modal.user}
        prompt={modal.prompt}
        onAuthenticated={handleAuthenticated}
        onOnboarded={handleOnboarded}
        onOpenChange={onOpenChange}
      />
      <VerifyCodeModal
        open={verifyCodeOpen}
        email={user?.email}
        resend={resendVerification}
        onVerified={handleCodeVerified}
        onOpenChange={setVerifyCodeOpen}
      />
      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-semibold">Log out of Bettereads?</DialogTitle>
            <DialogDescription>You can sign back in anytime with your email or Google.</DialogDescription>
          </DialogHeader>
          <Alert>
            <LogOut />
            <AlertTitle>You'll be signed out on this device</AlertTitle>
            <AlertDescription>Any unsent messages or drafts won't be saved.</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setLogoutConfirmOpen(false); logout(); }}>Log out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
