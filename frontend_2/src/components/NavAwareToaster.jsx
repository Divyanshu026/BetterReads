import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';

// Top-center toasts that track the navbar: they sit just below it when it's
// shown and slide up to near the top edge when it hides on scroll, so there's
// never a gap between the top of the screen and the toast. Driven by the
// `betterreads:nav-visibility` event the navbar dispatches.
const SHOWN = 104;
const SHOWN_MOBILE = 84;
const HIDDEN = 16;

export default function NavAwareToaster() {
  const [navHidden, setNavHidden] = useState(false);

  useEffect(() => {
    const onVisibility = (event) => setNavHidden(Boolean(event.detail?.hidden));
    window.addEventListener('betterreads:nav-visibility', onVisibility);
    return () => window.removeEventListener('betterreads:nav-visibility', onVisibility);
  }, []);

  return (
    <Toaster
      position="top-center"
      closeButton
      offset={navHidden ? HIDDEN : SHOWN}
      mobileOffset={navHidden ? HIDDEN : SHOWN_MOBILE}
    />
  );
}
