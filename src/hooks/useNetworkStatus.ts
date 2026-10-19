import { useCallback, useSyncExternalStore } from 'react';
import { isBrowser } from '../utils/isBrowser';

export interface NetworkStatus {
  online: boolean;
}

/**
 * Tracks the browser's online/offline status, updating on connectivity changes.
 *
 * SSR-safe: assumes `online: true` on the server and first paint, then reflects
 * `navigator.onLine` after hydration.
 *
 * @example
 * ```tsx
 * const { online } = useNetworkStatus();
 * {!online && <Banner>You are offline — changes will sync when reconnected.</Banner>}
 * ```
 *
 * Note: `navigator.onLine` reports whether the device has a network connection,
 * not whether the internet or your API is actually reachable.
 */
export function useNetworkStatus(): NetworkStatus {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (!isBrowser) return () => {};
    window.addEventListener('online', onStoreChange);
    window.addEventListener('offline', onStoreChange);
    return () => {
      window.removeEventListener('online', onStoreChange);
      window.removeEventListener('offline', onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => (isBrowser ? navigator.onLine : true), []);
  const getServerSnapshot = useCallback(() => true, []);

  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { online };
}
