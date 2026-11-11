import { appPath } from './services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Navbar from './components/Navbar.jsx';
import { apiBase } from './services/api.js';
import { markSignedOut } from './services/auth.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldGroup, Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Landing page for the link in the password-reset email. Reads ?token=, lets
// the user set a new password, then confirms. The server revokes all existing
// sessions on reset, so we clear any local sign-in hint and send the user to
// log in with the new password.
export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('token') || '';
    setToken(value);
    if (!value) setError('This reset link is missing its token.');
  }, []);
  useEffect(() => { passwordRef.current?.focus(); }, []);

  async function submit(event) {
    event.preventDefault();
    if (busy || !token) return;
    setError('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));
    const confirm = String(form.get('confirm'));
    if (password.length < 8) { setError('Use a password of at least 8 characters.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setError('Password must be no more than 72 bytes.'); return; }
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || 'This reset link is invalid or has expired.');
      markSignedOut();
      setDone(true);
    } catch (err) {
      setError(err instanceof TypeError ? 'Unable to connect to the server. Please try again.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="mx-auto flex max-w-[480px] flex-col px-6 py-24 max-sm:px-4 max-sm:py-16">
        <Card>
          <CardHeader>
            {done && <CheckCircle2 className="size-10 text-brand-red" aria-hidden="true" />}
            <CardTitle className="font-heading text-2xl font-semibold">
              {done ? 'Password updated' : 'Choose a new password'}
            </CardTitle>
            <CardDescription>
              {done
                ? 'Your password has been changed and you have been signed out everywhere. Log in with your new password.'
                : 'Set a new password for your BetterReads account.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <Button type="button" className="w-full" onClick={() => window.location.assign(appPath('/login'))}>Log in</Button>
            ) : (
              <form onSubmit={submit} noValidate>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="reset-password">New password</FieldLabel>
                    <div className="relative">
                      <Input ref={passwordRef} id="reset-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required className="pr-10" disabled={!token} />
                      <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                    <FieldDescription>Use at least 8 characters.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="reset-confirm">Confirm password</FieldLabel>
                    <Input id="reset-confirm" name="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required disabled={!token} />
                  </Field>
                  {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                  <Button type="submit" className="w-full" disabled={busy || !token}>{busy ? 'Saving…' : 'Update password'}</Button>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
