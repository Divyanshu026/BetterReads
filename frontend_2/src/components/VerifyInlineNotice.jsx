import { useAuth } from '../services/AuthContext.jsx';

// Inline error shown when the server blocks an action because the email is not
// verified. The "Click here to verify" link opens the shared verify-code modal.
// `onBeforeOpen` lets a caller dismiss its own modal first (e.g. a native
// <dialog> that would otherwise sit above the verify modal's top layer).
export default function VerifyInlineNotice({ message, onBeforeOpen }) {
  const { openVerifyCode } = useAuth();
  return (
    <p className="text-sm text-destructive" role="alert">
      {message || 'Please verify your email to continue.'}{' '}
      <button
        type="button"
        className="font-semibold underline underline-offset-2 hover:no-underline"
        onClick={() => { onBeforeOpen?.(); openVerifyCode(); }}
      >
        Click here to verify
      </button>
    </p>
  );
}
