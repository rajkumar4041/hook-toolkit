import { useEffect } from 'react';
import { useLatest } from './useLatest';

/**
 * Runs `callback` on a fixed interval without stale-closure bugs.
 *
 * The callback is always the latest one you passed, so it reads current props
 * and state without resetting the timer. Pass `delayMs = null` to pause.
 *
 * @example
 * ```tsx
 * // Tick every second, pause when `isRunning` is false.
 * useInterval(() => setSeconds((s) => s + 1), isRunning ? 1000 : null);
 * ```
 *
 * @param callback Function to run on each tick.
 * @param delayMs  Interval in milliseconds, or `null` to pause.
 */
export function useInterval(callback: () => void, delayMs: number | null): void {
  const savedCallback = useLatest(callback);

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs, savedCallback]);
}
