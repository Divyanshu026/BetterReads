// Loads Google Identity Services once and renders Google's official sign-in button.
// The backend decides whether Google is actually enabled (/api/auth/providers);
// this only runs when a client ID is present on the frontend too.
export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise = null;

function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Unable to load Google sign-in.')));
      return;
    }
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = null; reject(new Error('Unable to load Google sign-in.')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// Render the Google button into `container`. `onCredential` receives the ID token
// string. Returns a cleanup function. Rejects if the script or client ID is unavailable.
export async function renderGoogleButton(container, onCredential, { theme = 'outline' } = {}) {
  if (!googleClientId) throw new Error('Google sign-in is not configured.');
  if (!container) return () => {};
  await loadScript();
  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: (response) => { if (response?.credential) onCredential(response.credential); },
  });
  container.innerHTML = '';
  window.google.accounts.id.renderButton(container, {
    theme,
    size: 'large',
    width: Math.round(Math.min(container.clientWidth || 320, 360)),
    text: 'continue_with',
    shape: 'pill',
    logo_alignment: 'center',
  });
  return () => { try { window.google?.accounts?.id?.cancel(); } catch { /* noop */ } };
}
