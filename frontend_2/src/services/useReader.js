// Backwards-compatible shim: the current reader now lives in the shared
// AuthContext so there is a single source of truth and one /api/auth/me fetch
// per session. Existing callers keep using { user, loading, error, refresh }.
import { useAuth } from './AuthContext.jsx';

export default function useReader() {
  const { user, loading, error, refresh } = useAuth();
  return { user, loading, error, refresh };
}
