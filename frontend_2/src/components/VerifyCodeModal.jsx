import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { apiBase } from '../services/api.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const CODE_TTL_SECONDS = 5 * 60; // must match backend VERIFY_CODE_TTL_MS
const RESEND_COOLDOWN_SECONDS = 30;
const mmss = (total) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;

// Confirm the signed-in account's email by typing the 6-digit code from the
// verification email. No code is sent until the user presses "Send code"
// (a code is only valid for 5 minutes, so we don't send one they might not
// read in time). `onVerified(user)` fires on success; `resend` emails a code.
export default function VerifyCodeModal({ open, email, onVerified, onOpenChange, resend }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0); // code validity countdown
  const [cooldown, setCooldown] = useState(0); // resend cooldown
  const inputRef = useRef(null);

  // Reset everything each time the modal opens; nothing is sent automatically.
  useEffect(() => {
    if (!open) return;
    setCode(''); setError(''); setBusy(false); setSending(false);
    setCodeSent(false); setSecondsLeft(0); setCooldown(0);
  }, [open]);

  // One ticking interval drives both the validity countdown and the resend
  // cooldown while the modal is open.
  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  const expired = codeSent && secondsLeft === 0;

  const sendCode = useCallback(async () => {
    if (sending || cooldown > 0) return;
    setSending(true); setError('');
    try {
      await resend();
      setCodeSent(true);
      setSecondsLeft(CODE_TTL_SECONDS);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode('');
      window.setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      setError(err.message || 'Could not send the code. Please try again.');
    } finally {
      setSending(false);
    }
  }, [sending, cooldown, resend]);

  async function submit(value) {
    if (busy || value.length !== 6) return;
    if (expired) { setError('This code has expired. Send a new one.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`${apiBase}/api/auth/verify-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || 'That code is incorrect. Please try again.');
      onVerified(data.user);
    } catch (err) {
      setError(err instanceof TypeError ? 'Unable to connect to the server. Please try again.' : err.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground"><MailCheck className="size-5" /></div>
          <DialogTitle className="font-heading text-2xl font-bold tracking-tight">Verify your email</DialogTitle>
          <DialogDescription>
            {codeSent
              ? <>We sent a 6-digit code{email ? <> to <strong className="font-medium text-foreground">{email}</strong></> : ''}. Enter it below — it is valid for 5 minutes.</>
              : <>Send a 6-digit code{email ? <> to <strong className="font-medium text-foreground">{email}</strong></> : ' to your email'} and enter it here to confirm your address.</>}
          </DialogDescription>
        </DialogHeader>

        {!codeSent ? (
          <div className="flex flex-col items-center gap-4 py-2">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <Button type="button" onClick={sendCode} disabled={sending} className="w-full">
              {sending ? 'Sending…' : 'Send code'}
            </Button>
          </div>
        ) : (
          <form className="flex flex-col items-center gap-4 py-2" onSubmit={(e) => { e.preventDefault(); submit(code); }}>
            <Input
              ref={inputRef}
              value={code}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(next); setError('');
                if (next.length === 6) submit(next);
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              disabled={busy || expired}
              aria-label="Verification code"
              className="h-14 w-full max-w-[220px] text-center text-2xl font-semibold tracking-[0.5em]"
              placeholder="000000"
            />

            {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Verifying…</p>}
            {!busy && error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            {!busy && !error && (expired
              ? <p className="text-sm text-destructive" role="status">Your code has expired. Send a new one.</p>
              : <p className="text-sm text-muted-foreground" role="status">Code expires in {mmss(secondsLeft)}</p>)}

            <Button type="button" onClick={() => submit(code)} disabled={busy || expired || code.length !== 6} className="w-full">
              {busy ? 'Verifying…' : 'Verify email'}
            </Button>
            <button
              type="button"
              onClick={sendCode}
              disabled={sending || (cooldown > 0 && !expired)}
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-60 disabled:no-underline"
            >
              {sending ? 'Sending…' : cooldown > 0 && !expired ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
