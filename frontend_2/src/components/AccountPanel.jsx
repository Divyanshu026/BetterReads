import { appPath } from '../services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import MessageInbox from './MessageInbox.jsx';
import { getToken, setToken, clearToken } from '../services/auth.js';
import { googleClientId, renderGoogleButton } from '../services/google.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldGroup, Field, FieldLabel, FieldDescription } from '@/components/ui/field';

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
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const googleRef = useRef(null);
  const firstFieldRef = useRef(null);

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

  // Ask the backend which social providers it can actually complete.
  useEffect(() => {
    if (!googleClientId) return undefined;
    const controller = new AbortController();
    fetch(`${apiBase}/api/auth/providers`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data) setGoogleEnabled(Boolean(data.google)); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Render Google's official button while the signed-out form is showing.
  useEffect(() => {
    if (checking || user || !googleEnabled) return undefined;
    let cleanup = () => {};
    let active = true;
    renderGoogleButton(googleRef.current, handleGoogleCredential)
      .then((fn) => { if (active) cleanup = fn; else fn(); })
      .catch(() => { if (active) setGoogleError('Google sign-in could not load. Use your email instead.'); });
    return () => { active = false; cleanup(); };
  }, [checking, user, googleEnabled, mode]);

  // Move focus to the first field when switching between log in and sign up.
  useEffect(() => {
    if (!checking && !user) firstFieldRef.current?.focus();
  }, [mode, checking, user]);

  async function handleGoogleCredential(credential) {
    if (busy) return;
    setError('');
    setGoogleError('');
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await readAccountResponse(response);
      if (typeof data.token !== 'string' || !data.user) {
        throw new Error('The account server returned an invalid response. Please try again.');
      }
      setToken(data.token, true);
      setUser(data.user);
      onAuthenticated?.();
    } catch (err) {
      setError(err instanceof TypeError ? 'Unable to connect to the server. Please try again.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    const name = mode === 'register' ? String(form.get('name')).trim() : '';
    if (mode === 'register' && !name) {
      setError('Enter your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setError('Use a password of at least 8 characters.');
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError('Password must be no more than 72 bytes.');
      return;
    }
    const body = { email, password };
    if (mode === 'register') body.name = name;
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

  if (checking) return <p role="status" className="text-sm text-muted-foreground">Loading your account…</p>;
  if (user && showInbox) return <><Button variant="ghost" size="sm" type="button" className="mb-2" onClick={() => setShowInbox(false)}>Back to profile</Button><MessageInbox user={user} /></>;
  if (user) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm">Welcome, {user.name || 'reader'}.</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <p className="text-sm text-muted-foreground">Your books, requests, and reading list are ready.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><a href={appPath('/readers/me')}>My profile &amp; listings</a></Button>
          <Button variant="outline" size="sm" type="button" onClick={() => window.dispatchEvent(new CustomEvent('betterreads:open-wishlist'))}>Wishlist</Button>
          <Button variant="outline" size="sm" type="button" onClick={() => window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'requests' } }))}>Requests</Button>
        </div>
        <Button type="button" className="self-start" onClick={() => window.dispatchEvent(new CustomEvent('betterreads:open-inbox', { detail: { tab: 'messages' } }))}>Messages</Button>
        <Button variant="ghost" size="sm" type="button" className="self-start text-muted-foreground" onClick={() => { clearToken(); setUser(null); setError(''); }}>Log out</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex gap-1 self-start rounded-full bg-muted p-1" aria-label="Account options">
        <button type="button" className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors', mode === 'register' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')} aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>Sign up</button>
        <button type="button" className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors', mode === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')} aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
      </div>
      <div>
        <h3 className="font-heading text-lg font-semibold">{mode === 'register' ? 'Begin your next chapter.' : 'Welcome back, reader.'}</h3>
        <p className="text-sm text-muted-foreground">{mode === 'register' ? 'Create an account to join BetterReads.' : 'Log in to your BetterReads account.'}</p>
      </div>
      {googleEnabled && (
        <>
          <div aria-label="Continue with Google"><div ref={googleRef} className="google-button-slot" /></div>
          {googleError && <p className="text-sm text-muted-foreground" role="status">{googleError}</p>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or continue with email<span className="h-px flex-1 bg-border" /></div>
        </>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          {mode === 'register' && <Field><FieldLabel htmlFor="ap-name">Name</FieldLabel><Input ref={firstFieldRef} id="ap-name" name="name" autoComplete="name" maxLength={100} required /></Field>}
          <Field><FieldLabel htmlFor="ap-email">Email</FieldLabel><Input ref={mode === 'register' ? undefined : firstFieldRef} id="ap-email" name="email" type="email" autoComplete="email" inputMode="email" required /></Field>
          <Field>
            <FieldLabel htmlFor="ap-password">Password</FieldLabel>
            <div className="relative">
              <Input id="ap-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : undefined} required className="pr-10" />
              <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {mode === 'register' && <FieldDescription>Use at least 8 characters.</FieldDescription>}
          </Field>
          <Field orientation="horizontal"><input id="ap-remember" name="remember" type="checkbox" className="size-4 accent-primary" /><FieldLabel htmlFor="ap-remember" className="font-normal">Remember me</FieldLabel></Field>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</Button>
        </FieldGroup>
      </form>
    </div>
  );
}


