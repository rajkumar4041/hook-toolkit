import { useEffect } from 'react';
import { useLatest } from './useLatest';

/**
 * Runs `callback` once after `delayMs`, with automatic cleanup and no
 * stale-closure bugs. Pass `delayMs = null` to cancel/disable.
 *
 * Changing `delayMs` restarts the timer; changing only the callback does not.
 *
 * @example
 * ```tsx
 * // Hide a toast after 3s.
 * useTimeout(() => setVisible(false), visible ? 3000 : null);
 * ```
 *
 * @param callback Function to run when the timeout fires.
 * @param delayMs  Delay in milliseconds, or `null` to disable.
 */
export function useTimeout(callback: () => void, delayMs: number | null): void {
  const savedCallback = useLatest(callback);

  useEffect(() => {
    if (delayMs === null) return;
    const id = setTimeout(() => savedCallback.current(), delayMs);
    return () => clearTimeout(id);
  }, [delayMs, savedCallback]);
}
