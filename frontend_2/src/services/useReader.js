import { useEffect, useState } from 'react';
import { getCurrentUser } from './api.js';
import { clearToken, getToken } from './auth.js';
export default function useReader() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    const token = getToken();
    if (!token) { setLoading(false); setUser(null); setError(''); return () => { active = false; }; }
    setLoading(true); setError('');
    getCurrentUser().then((data) => { if (active && getToken() === token) setUser(data.user); }).catch((err) => {
      if (!active || getToken() !== token) return;
      if (err.status === 401) { clearToken(token); setUser(null); setError(''); }
      else setError(err.status === 429 ? 'Too many requests. Please wait a few minutes and try again.' : 'Unable to check your account. Check that the backend is running and try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);
  useEffect(() => { const changed = () => setVersion((n) => n + 1); window.addEventListener('betterreads:auth-change', changed); window.addEventListener('betterreads:profile-change', changed); return () => { window.removeEventListener('betterreads:auth-change', changed); window.removeEventListener('betterreads:profile-change', changed); }; }, []);
  return { user, loading, error, refresh: () => setVersion((n) => n + 1) };
}
