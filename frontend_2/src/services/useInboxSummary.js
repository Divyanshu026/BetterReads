import { useCallback, useEffect, useState } from 'react';
import { api, getToken, getCurrentUser } from './api.js';
export default function useInboxSummary() {
  const [summary, setSummary] = useState({ unread: null, pending: null });
  const refresh = useCallback(async () => {
    if (!getToken()) { setSummary({ unread: 0, pending: 0 }); return; }
    try {
      const [{ user }, chats, offers] = await Promise.all([getCurrentUser(), api('/api/chats'), api('/api/offers')]);
      const details = await Promise.allSettled(chats.map((chat) => api(`/api/chats/${encodeURIComponent(chat._id)}`)));
      const unread = details.some((item) => item.status === 'rejected') ? null : details.reduce((count, item) => count + (item.value.messages || []).filter((message) => !message.seen && String(message.senderId?._id || message.senderId) !== String(user.id)).length, 0);
      const pending = offers.filter((offer) => offer.status === 'pending' && String(offer.listingId?.ownerId) === String(user.id)).length;
      setSummary({ unread, pending });
    } catch { setSummary({ unread: null, pending: null }); }
  }, []);
  useEffect(() => { refresh(); const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 300000); window.addEventListener('betterreads:inbox-change', refresh); window.addEventListener('betterreads:auth-change', refresh); return () => { window.clearInterval(timer); window.removeEventListener('betterreads:inbox-change', refresh); window.removeEventListener('betterreads:auth-change', refresh); }; }, [refresh]);
  return { ...summary, refresh };
}
