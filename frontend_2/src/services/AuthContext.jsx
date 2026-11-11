import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentUser } from './api.js';
import { clearToken, getToken } from './auth.js';
import AuthModal from '../components/AuthModal.jsx';

const AuthContext = createContext(null);

// A single app-wide auth provider: it owns the current user, the shared auth
// modal, and a `requireAuth(action)` gate that opens the modal for guests and
// resumes the pending action after a successful sign-in (and onboarding).
//
// Mount this once near the root. Every page reads it through useAuth().
export function AuthProvider({ children, initialAuth = null }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  // Modal state. `step` is 'auth' (login/signup) or 'onboarding' (username).
  const [modal, setModal] = useState({ open: false, mode: 'login', step: 'auth', prompt: '', user: null });
  const pendingAction = useRef(null);

  // Direct /login and /signup links open the shared modal in the right mode,
  // unless the visitor is already signed in.
  useEffect(() => {
    if (!initialAuth || getToken()) return;
    setModal({ open: true, mode: initialAuth === 'register' ? 'register' : 'login', step: 'auth', prompt: '', user: null });
  }, [initialAuth]);

  // Load / refresh the current user whenever the token changes.
  useEffect(() => {
    let active = true;
    const token = getToken();
    if (!token) { setUser(null); setLoading(false); setError(''); return () => { active = false; }; }
    setLoading(true);
    setError('');
    getCurrentUser()
      .then((data) => { if (active && getToken() === token) setUser(data.user); })
      .catch((err) => {
        if (!active || getToken() !== token) return;
        if (err.status === 401) { clearToken(token); setUser(null); setError(''); }
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
    }
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

  const logout = useCallback(() => { clearToken(); setUser(null); setError(''); }, []);

  const value = useMemo(
    () => ({ user, loading, error, refresh, requireAuth, openAuth, closeModal, logout }),
    [user, loading, error, refresh, requireAuth, openAuth, closeModal, logout],
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
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
