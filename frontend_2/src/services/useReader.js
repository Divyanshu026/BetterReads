import { useEffect, useState } from 'react';
import { api, getToken } from './api.js';
export default function useReader() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    if (!getToken()) { setLoading(false); setUser(null); return () => { active = false; }; }
    setLoading(true);
    api('/api/auth/me').then((data) => { if (active) setUser(data.user); }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);
  return { user, loading, refresh: () => setVersion((n) => n + 1) };
}
