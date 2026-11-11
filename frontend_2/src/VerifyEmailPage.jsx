import { appPath } from './services/paths.js';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Navbar from './components/Navbar.jsx';
import { apiBase } from './services/api.js';
import { markSignedIn } from './services/auth.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Landing page for the link in the verification email. Reads ?token=, confirms
// it with the server, and reports the outcome. A verify link also establishes a
// session server-side, so on success we record the local sign-in hint.
export default function VerifyEmailPage() {
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    // React 18 StrictMode double-invokes effects in dev; the token is single-use
    // so guard against consuming it twice.
    if (ran.current) return;
    ran.current = true;
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setStatus('error'); setMessage('This verification link is missing its token.'); return; }
    fetch(`${apiBase}/api/auth/verify-email?token=${encodeURIComponent(token)}`, { credentials: 'include' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error?.message || 'This verification link is invalid or has expired.');
        setStatus('success');
        if (data.user) markSignedIn();
      })
      .catch((err) => { setStatus('error'); setMessage(err.message); });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="mx-auto flex max-w-[640px] flex-col items-center px-6 py-24 max-sm:px-4 max-sm:py-16">
        <Card className="w-full">
          <CardHeader className="items-center text-center">
            {status === 'verifying' && <Loader2 className="size-10 animate-spin text-muted-foreground" aria-hidden="true" />}
            {status === 'success' && <CheckCircle2 className="size-10 text-brand-red" aria-hidden="true" />}
            {status === 'error' && <XCircle className="size-10 text-destructive" aria-hidden="true" />}
            <CardTitle className="font-heading text-2xl font-semibold">
              {status === 'verifying' ? 'Verifying your email…' : status === 'success' ? 'Email verified' : 'Verification failed'}
            </CardTitle>
            <CardDescription>
              {status === 'verifying'
                ? 'One moment while we confirm your link.'
                : status === 'success'
                  ? 'Your email address is confirmed. You now have full access to BetterReads.'
                  : message}
            </CardDescription>
          </CardHeader>
          {status !== 'verifying' && (
            <CardContent className="flex justify-center">
              <Button type="button" onClick={() => window.location.assign(appPath('/'))}>
                {status === 'success' ? 'Start exploring' : 'Back to BetterReads'}
              </Button>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
}
