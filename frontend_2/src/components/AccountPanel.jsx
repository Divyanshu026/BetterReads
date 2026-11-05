import { appPath } from '../services/paths.js';
import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import MessageInbox from './MessageInbox.jsx';
import { getToken, setToken, clearToken } from '../services/auth.js';

const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function readAccountResponse(response) {
  if (response.status === 429) throw new Error('Too many requests. Please wait a few minutes and try again.');
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('The account server is unavailable. Check that the backend is running, then try again.');
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The account server returned an invalid response. Please try again.');
  }
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Unable to continue. Please try again.');
  }
  return data;
}

export default function AccountPanel({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(getToken()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showInbox, setShowInbox] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;
    const controller = new AbortController();
    fetch(`${apiBase}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          clearToken(token);
          throw new Error('Your session has expired. Please log in again.');
        }
        const data = await readAccountResponse(response);
        if (!data.user) throw new Error('The account server returned an invalid response. Please try again.');
        setUser(data.user);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message || 'Unable to connect. Please try again.');
      })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));
    if (new TextEncoder().encode(password).length > 72) {
      setError('Password must be no more than 72 bytes.');
      return;
    }
    const body = { email: String(form.get('email')).trim(), password };
    if (mode === 'register') body.name = String(form.get('name')).trim();
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await readAccountResponse(response);
      if (typeof data.token !== 'string' || !data.user) {
        throw new Error('The account server returned an invalid response. Please try again.');
      }
      setToken(data.token, form.has('remember'));
      setUser(data.user);
      onAuthenticated?.();
    } catch (err) {
      setError(err instanceof TypeError ? 'Unable to connect to the server. Please try again.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <p role="status">Loading your account…</p>;
  if (user && showInbox) return <><button type="button" className="listing-return" onClick={() => setShowInbox(false)}>Back to profile</button><MessageInbox user={user} /></>;
  if (user) {
    return (
      <div className="account-panel">
        <p>Welcome, {user.name || 'reader'}.</p>
        <p className="account-email">{user.email}</p>
        <p className="panel-note">Your books, requests, and reading list are ready.</p>
        <p><a className="detail-secondary" href={appPath('/readers/me')}>My profile &amp; listings</a> <a className="detail-secondary" href={appPath('/wishlist')}>Wishlist</a> <button className="detail-secondary" type="button" onClick={() => window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'requests' } }))}>Requests</button></p>
        <button className="button button-red" type="button" onClick={() => window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'messages' } }))}>Messages</button>
        <button className="detail-secondary account-logout" type="button" onClick={() => {
          clearToken();
          setUser(null);
          setError('');
        }}>Log out</button>
      </div>
    );
  }
  return (
    <div className="account-panel">
      <div className="account-tabs" aria-label="Account options">
        <button type="button" className={mode === 'register' ? 'active' : ''} aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>Sign up</button>
        <button type="button" className={mode === 'login' ? 'active' : ''} aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
      </div>
      <h3>{mode === 'register' ? 'Begin your next chapter.' : 'Welcome back, reader.'}</h3>
      <p>{mode === 'register' ? 'Create an account to join BetterReads.' : 'Log in to your BetterReads account.'}</p>
      <div className="account-social" aria-label="Social sign-in options">
        <button type="button" disabled>Apple</button>
        <button type="button" disabled>Google</button>
        <button type="button" disabled>X</button>
      </div>
      <p className="account-social-note">Social sign-in is not available yet.</p>
      <div className="account-divider"><span>or continue with email</span></div>
      <form className="account-form" onSubmit={handleSubmit}>
        {mode === 'register' && <label>Name<input name="name" autoComplete="name" maxLength={100} required /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<span className="account-password"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : undefined} required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
        {mode === 'register' && <small>Use at least 8 characters.</small>}
        <label className="account-remember"><input name="remember" type="checkbox" /> Remember me</label>
        {error && <p className="account-error" role="alert">{error}</p>}
        <button className="button button-red account-submit" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}


