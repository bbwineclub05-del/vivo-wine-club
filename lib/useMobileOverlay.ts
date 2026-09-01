'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Locks scroll on both `<body>` and the app's real scroll container while
 * `active` is true. In /members the real scroll container is
 * `<main id="members-scroll-root">`, not `<body>` — locking only body leaves
 * the background scrollable on touch while a modal is open (the background
 * can shift/scroll behind a fixed overlay). Restores the previous inline
 * value on cleanup, so nesting with another lock on the same element is
 * still safe as long as each instance's own setup/cleanup pair runs intact.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const scrollRoot = document.getElementById('members-scroll-root');
    const targets = [document.body, scrollRoot].filter((el): el is HTMLElement => !!el);
    const prevOverflow = targets.map((el) => el.style.overflow);
    targets.forEach((el) => { el.style.overflow = 'hidden'; });
    return () => {
      targets.forEach((el, i) => { el.style.overflow = prevOverflow[i]; });
    };
  }, [active]);
}

/**
 * Makes the mobile hardware/gesture back button close an overlay instead of
 * navigating away from the whole members area. Pushes a history entry while
 * `active` is true and calls `onClose` on `popstate`. If the overlay closes
 * some other way (e.g. an X button), the pushed entry is popped on cleanup
 * so a later back-press doesn't land on a stale state.
 *
 * Known limitation: if two overlays are open at once (nested), a single
 * back-press closes both rather than just the topmost one, since each
 * instance listens to the same global `popstate` event. Still a large
 * improvement over today (back leaves the app entirely), and covers the
 * overwhelming majority of cases where only one overlay is open at a time.
 */
export function useOverlayBackClose(active: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => { onCloseRef.current = onClose; });
  const closingViaBack = useRef(false);

  useEffect(() => {
    if (!active) return;
    closingViaBack.current = false;
    history.pushState({ vivoOverlay: true }, '');
    const handlePopState = () => {
      closingViaBack.current = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!closingViaBack.current && history.state?.vivoOverlay) {
        history.back();
      }
    };
  }, [active]);
}

/**
 * Convenience wrapper combining both behaviours above, for overlays that
 * don't already implement their own scroll lock. If a component already
 * locks scroll correctly on its own, use `useOverlayBackClose` alone instead
 * to avoid a redundant second lock on the same element.
 */
export function useMobileOverlay(active: boolean, onClose: () => void) {
  useScrollLock(active);
  useOverlayBackClose(active, onClose);
}
