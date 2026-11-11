import { useState } from 'react';
import { MailWarning, X } from 'lucide-react';
import { useAuth } from '../services/AuthContext.jsx';

// A dismissible banner nudging signed-in users to verify their email. Part of
// the soft gate: browsing stays open, but sensitive actions (offers, messaging,
// checkout) are blocked server-side until the email is confirmed. Hidden for
// guests, verified users, and once dismissed for the session.
export default function VerifyEmailBanner() {
  const { user, resendVerification } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [message, setMessage] = useState('');

  if (!user || user.emailVerified || dismissed) return null;

  async function resend() {
    if (state === 'sending') return;
    setState('sending');
    setMessage('');
    try {
      await resendVerification();
      setState('sent');
      setMessage('Verification email sent. Check your inbox and spam folder.');
    } catch (err) {
      setState('error');
      setMessage(err.message);
    }
  }

  return (
    <div className="border-b border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" role="status">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-6 py-2.5 text-sm max-sm:px-4">
        <MailWarning className="size-4 shrink-0" aria-hidden="true" />
        <p className="flex-1">
          {state === 'sent'
            ? message
            : <>Please verify your email to list books, make offers, and message readers.{' '}
                <button type="button" onClick={resend} disabled={state === 'sending'} className="font-semibold underline underline-offset-2 disabled:opacity-60">
                  {state === 'sending' ? 'Sending…' : 'Resend email'}
                </button>
                {state === 'error' && <span className="ml-2 text-destructive">{message}</span>}
              </>}
        </p>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 rounded p-1 hover:bg-amber-500/20">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
