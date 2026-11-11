import { useEffect, useRef, useState } from 'react';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { markSignedIn } from '../services/auth.js';
import { apiBase } from '../services/api.js';
import { googleClientId, renderGoogleButton } from '../services/google.js';
import {
  normalizeUsername,
  usernameError,
  checkUsername,
  suggestUsername,
  claimUsername,
  USERNAME_MAX,
} from '../services/username.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldGroup, Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

async function readAccountResponse(response) {
  if (response.status === 429) throw new Error('Too many requests. Please wait a few minutes and try again.');
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json'))
    throw new Error('The account server is unavailable. Check that the backend is running, then try again.');
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The account server returned an invalid response. Please try again.');
  }
  if (!response.ok) throw new Error(data?.error?.message || 'Unable to continue. Please try again.');
  return data;
}

// The username onboarding step shown once for brand-new accounts. The user may
// accept the server-suggested handle or choose their own; availability is
// checked on the server (the authority) with debounce, and we block continuing
// until a valid, unique username is saved.
function OnboardingStep({ user, onComplete, prompt }) {
  const [value, setValue] = useState(user?.username || '');
  const [status, setStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Seed a suggestion from the user's name on first mount.
  useEffect(() => {
    if (user?.username) return undefined;
    const controller = new AbortController();
    suggestUsername(user?.name || user?.email || 'reader', controller.signal)
      .then((suggested) => setValue((current) => current || suggested))
      .catch(() => {});
    return () => controller.abort();
  }, [user?.name, user?.email, user?.username]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounced server availability check with local validation first.
  useEffect(() => {
    const normalized = normalizeUsername(value);
    const localProblem = usernameError(normalized);
    if (localProblem) {
      setStatus(normalized ? 'invalid' : 'idle');
      setReason(normalized ? localProblem : '');
      return undefined;
    }
    setStatus('checking');
    setReason('');
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      checkUsername(normalized, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          if (result.available) { setStatus('available'); setReason(''); }
          else { setStatus(result.valid ? 'taken' : 'invalid'); setReason(result.reason || 'That username is unavailable.'); }
        })
        .catch((err) => { if (err.name !== 'AbortError') { setStatus('idle'); setReason(''); } });
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [value]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const normalized = normalizeUsername(value);
    const localProblem = usernameError(normalized);
    if (localProblem) { setStatus('invalid'); setReason(localProblem); return; }
    setBusy(true);
    setError('');
    try {
      const updated = await claimUsername(normalized);
      onComplete(updated);
    } catch (err) {
      if (err.status === 409) { setStatus('taken'); setReason(err.message); }
      else setError(err instanceof TypeError ? 'Unable to connect to the server. Please try again.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = status === 'available' && !busy;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted-foreground">{prompt || 'Pick a username so other readers can find and recognise you. You can change it later in your profile.'}</p>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="auth-username">Username</FieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-muted-foreground">@</span>
            <Input
              ref={inputRef}
              id="auth-username"
              name="username"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={USERNAME_MAX}
              className="pr-10 pl-8"
              aria-invalid={status === 'taken' || status === 'invalid'}
              aria-describedby="auth-username-status"
              required
            />
            <span className="absolute inset-y-0 right-0 flex w-10 items-center justify-center">
              {status === 'checking' && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
              {status === 'available' && <Check className="size-4 text-brand-red" aria-hidden="true" />}
            </span>
          </div>
          <FieldDescription id="auth-username-status" role="status" aria-live="polite">
            {status === 'available' ? 'That username is available.' : reason || '3–30 letters, numbers, dots or underscores.'}
          </FieldDescription>
        </Field>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {busy ? 'Saving…' : 'Continue'}
        </Button>
      </FieldGroup>
    </form>
  );
}

// The password-reset request step. Always reports success (the server does not
// reveal whether an address has an account), so the user is told to check their
// inbox regardless.
function ForgotPasswordForm({ onBack }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef(null);
  useEffect(() => { emailRef.current?.focus(); }, []);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const email = String(new FormData(event.currentTarget).get('email')).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/forgot-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      await readAccountResponse(response);
      setSent(true);
    } catch (err) {
      setError(err instanceof TypeError ? 'Unable to connect to the server. Please try again.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">If an account exists for that email, we have sent a link to reset your password. The link expires in 1 hour. Check your inbox and spam folder.</p>
        <Button type="button" variant="outline" className="w-full" onClick={onBack}>Back to log in</Button>
      </div>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted-foreground">Enter the email for your account and we will send a link to reset your password.</p>
      <FieldGroup>
        <Field><FieldLabel htmlFor="forgot-email">Email</FieldLabel><Input ref={emailRef} id="forgot-email" name="email" type="email" autoComplete="email" inputMode="email" required /></Field>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>Back to log in</Button>
      </FieldGroup>
    </form>
  );
}

// The shared login / sign-up form. `onAuthenticated(data)` receives the server
// payload ({ token, user, created }); the parent decides whether to show the
// onboarding step or finish.
function AuthForm({ initialMode = 'login', onAuthenticated }) {
  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login');
  const [view, setView] = useState('auth'); // 'auth' | 'forgot'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const googleRef = useRef(null);
  const firstFieldRef = useRef(null);

  useEffect(() => { setMode(initialMode === 'register' ? 'register' : 'login'); }, [initialMode]);

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

  // Render Google's official button while the form is showing.
  useEffect(() => {
    if (!googleEnabled) return undefined;
    let cleanup = () => {};
    let active = true;
    renderGoogleButton(googleRef.current, handleGoogleCredential)
      .then((fn) => { if (active) cleanup = fn; else fn(); })
      .catch(() => { if (active) setGoogleError('Google sign-in could not load. Use your email instead.'); });
    return () => { active = false; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleEnabled, mode]);

  useEffect(() => { firstFieldRef.current?.focus(); }, [mode]);

  async function handleGoogleCredential(credential) {
    if (busy) return;
    setError('');
    setGoogleError('');
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await readAccountResponse(response);
      if (!data.user)
        throw new Error('The account server returned an invalid response. Please try again.');
      // The server set the httpOnly session cookies; record the local hint.
      markSignedIn();
      onAuthenticated(data);
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
    if (mode === 'register' && !name) { setError('Enter your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
    if (mode === 'register' && password.length < 8) { setError('Use a password of at least 8 characters.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setError('Password must be no more than 72 bytes.'); return; }
    const body = { email, password };
    if (mode === 'register') body.name = name;
    setBusy(true);
    try {
      // `remember` controls the refresh-cookie lifetime server-side.
      body.remember = form.has('remember');
      const response = await fetch(`${apiBase}/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await readAccountResponse(response);
      if (!data.user)
        throw new Error('The account server returned an invalid response. Please try again.');
      // The server set the httpOnly session cookies; record the local hint.
      markSignedIn();
      onAuthenticated(data);
    } catch (err) {
      setError(err instanceof TypeError ? 'Unable to connect to the server. Please try again.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  if (view === 'forgot') return <ForgotPasswordForm onBack={() => { setView('auth'); setError(''); }} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex gap-1 self-start rounded-full bg-muted p-1" role="group" aria-label="Account options">
        <button type="button" className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors', mode === 'register' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')} aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>Sign up</button>
        <button type="button" className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors', mode === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')} aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Log in</button>
      </div>
      {googleEnabled ? (
        <>
          <div aria-label="Continue with Google"><div ref={googleRef} className="google-button-slot" /></div>
          {googleError && <p className="text-sm text-muted-foreground" role="status">{googleError}</p>}
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or continue with email<span className="h-px flex-1 bg-border" /></div>
        </>
      ) : googleClientId ? (
        <p className="text-sm text-muted-foreground">Continue with your email and password below.</p>
      ) : null}
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          {mode === 'register' && <Field><FieldLabel htmlFor="auth-name">Name</FieldLabel><Input ref={firstFieldRef} id="auth-name" name="name" autoComplete="name" maxLength={100} required /></Field>}
          <Field><FieldLabel htmlFor="auth-email">Email</FieldLabel><Input ref={mode === 'register' ? undefined : firstFieldRef} id="auth-email" name="email" type="email" autoComplete="email" inputMode="email" required /></Field>
          <Field>
            <FieldLabel htmlFor="auth-password">Password</FieldLabel>
            <div className="relative">
              <Input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : undefined} required className="pr-10" />
              <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {mode === 'register' && <FieldDescription>Use at least 8 characters.</FieldDescription>}
          </Field>
          <div className="flex items-center justify-between gap-3">
            <Field orientation="horizontal" className="mb-0"><input id="auth-remember" name="remember" type="checkbox" className="size-4 accent-primary" /><FieldLabel htmlFor="auth-remember" className="font-normal">Remember me</FieldLabel></Field>
            {mode === 'login' && <button type="button" className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" onClick={() => { setView('forgot'); setError(''); }}>Forgot password?</button>}
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</Button>
        </FieldGroup>
      </form>
    </div>
  );
}

// The shared, accessible auth modal. Radix Dialog gives us the focus trap,
// Escape-to-close, and labelling; we drive open state and the two steps.
export default function AuthModal({ open, mode = 'login', step = 'auth', user, prompt, onAuthenticated, onOnboarded, onOpenChange }) {
  const title = step === 'onboarding' ? 'Choose your username' : mode === 'register' ? 'Join BetterReads' : 'Welcome back';
  const description = step === 'onboarding'
    ? 'One last step to finish setting up your account.'
    : mode === 'register'
      ? 'Create an account to save books, list your shelf, and message readers.'
      : 'Log in to pick up where you left off.';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-md"
        // During required onboarding, don't let outside-click or Escape dismiss
        // into a half-finished account.
        onInteractOutside={(event) => { if (step === 'onboarding') event.preventDefault(); }}
        onEscapeKeyDown={(event) => { if (step === 'onboarding') event.preventDefault(); }}
        showCloseButton={step !== 'onboarding'}
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-bold tracking-tight">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {step === 'onboarding'
          ? <OnboardingStep user={user} prompt={prompt} onComplete={onOnboarded} />
          : <AuthForm initialMode={mode} onAuthenticated={onAuthenticated} />}
      </DialogContent>
    </Dialog>
  );
}

export { AuthForm, OnboardingStep };
