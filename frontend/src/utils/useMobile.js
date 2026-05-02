import { useState, useEffect } from 'react';

/**
 * useMobile — Returns true when the viewport is narrower than 768px.
 * Listens for resize events so it updates dynamically if the user rotates
 * their device or resizes the browser window.
 */
export function useMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);

    // Modern API (add/removeEventListener)
    mql.addEventListener('change', handler);
    // Sync once on mount in case matchMedia differs from innerWidth
    setIsMobile(mql.matches);

    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

export default useMobile;
