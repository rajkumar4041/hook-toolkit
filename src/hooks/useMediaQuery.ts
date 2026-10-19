import { useCallback, useSyncExternalStore } from 'react';
import { isBrowser } from '../utils/isBrowser';

export interface UseMediaQueryOptions {
  /** Value returned during SSR and the first paint (before hydration). Defaults to `false`. */
  defaultValue?: boolean;
}

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 *
 * SSR-safe via `useSyncExternalStore`: renders `defaultValue` on the server and
 * first client paint, then updates to the real match after hydration.
 *
 * @example
 * ```tsx
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 * const isMobile = useMediaQuery('(max-width: 640px)');
 * ```
 *
 * @param query   A media query string, e.g. `'(min-width: 768px)'`.
 * @param options `defaultValue` for SSR/first paint.
 */
export function useMediaQuery(query: string, options: UseMediaQueryOptions = {}): boolean {
  const { defaultValue = false } = options;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isBrowser || typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (!isBrowser || typeof window.matchMedia !== 'function') return defaultValue;
    return window.matchMedia(query).matches;
  }, [query, defaultValue]);

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
