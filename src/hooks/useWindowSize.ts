import { useState } from 'react';
import { useEventListener } from './useEventListener';
import { useIsomorphicLayoutEffect } from '../utils/useIsomorphicLayoutEffect';
import { isBrowser } from '../utils/isBrowser';

export interface WindowSize {
  width: number;
  height: number;
}

/**
 * Tracks the viewport dimensions, updating on window resize.
 *
 * SSR-safe: starts at `{ width: 0, height: 0 }` (so server and client markup
 * match) and reads the real size in a layout effect after mount, avoiding
 * hydration mismatches.
 *
 * @example
 * ```tsx
 * const { width } = useWindowSize();
 * const columns = width < 640 ? 1 : width < 1024 ? 2 : 3;
 * ```
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({ width: 0, height: 0 });

  useIsomorphicLayoutEffect(() => {
    if (!isBrowser) return;
    const read = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    read();
  }, []);

  useEventListener('resize', () => {
    setSize({ width: window.innerWidth, height: window.innerHeight });
  });

  return size;
}
