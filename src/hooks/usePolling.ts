import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatest } from './useLatest';
import { useIsMounted } from './useIsMounted';

export interface UsePollingOptions {
  /** Poll interval in ms (measured from the end of each run to the next start). */
  interval: number;
  /** Whether polling is active. Defaults to `true`. */
  enabled?: boolean;
  /** Run once immediately when polling starts. Defaults to `true`. */
  immediate?: boolean;
  /** Called when a poll rejects. */
  onError?: (error: Error) => void;
}

export interface UsePolling<T> {
  data: T | null;
  error: Error | null;
  /** `true` while polling is active. */
  isPolling: boolean;
  /** Epoch ms of the last successful poll, or `null`. */
  lastUpdated: number | null;
  /** Start polling (no-op if already active). */
  start: () => void;
  /** Stop polling and abort any in-flight request. */
  stop: () => void;
  /** Trigger an immediate poll now, independent of the schedule. */
  refresh: () => Promise<void>;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Periodically runs an async function and exposes the latest result, with
 * start/stop control and automatic cleanup.
 *
 * The next poll is scheduled only after the previous one settles, so slow
 * responses never overlap or stack up. The in-flight request is aborted when
 * polling stops or the component unmounts.
 *
 * @example
 * ```tsx
 * const { data, isPolling, stop } = usePolling(
 *   (signal) => fetch('/api/status', { signal }).then((r) => r.json()),
 *   { interval: 5000 },
 * );
 * ```
 *
 * For a full server-cache with dedup/invalidation, prefer TanStack Query's
 * `refetchInterval`. This hook is a lightweight, dependency-free poller.
 *
 * @param fn      `(signal) => Promise<T>`.
 * @param options `interval` (required), `enabled`, `immediate`, `onError`.
 */
export function usePolling<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: UsePollingOptions,
): UsePolling<T> {
  const { interval, enabled = true, immediate = true } = options;
  const fnRef = useLatest(fn);
  const onErrorRef = useLatest(options.onError);
  const isMounted = useIsMounted();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const activeRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const poll = useCallback(async (): Promise<void> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await fnRef.current(controller.signal);
      if (!controller.signal.aborted && isMounted()) {
        setData(result);
        setError(null);
        setLastUpdated(Date.now());
      }
    } catch (err) {
      if (!controller.signal.aborted && isMounted()) {
        const e = toError(err);
        setError(e);
        onErrorRef.current?.(e);
      }
    }
  }, [fnRef, onErrorRef, isMounted]);

  // Schedule-after-settle loop, guarded by `activeRef`.
  const scheduleNext = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(async () => {
      if (!activeRef.current) return;
      await poll();
      if (activeRef.current) scheduleNext();
    }, interval);
  }, [interval, poll, clearTimer]);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    setIsPolling(true);
    const begin = async () => {
      if (immediate) {
        await poll();
        if (activeRef.current) scheduleNext();
      } else {
        scheduleNext();
      }
    };
    void begin();
  }, [immediate, poll, scheduleNext]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setIsPolling(false);
    clearTimer();
    controllerRef.current?.abort();
  }, [clearTimer]);

  const refresh = useCallback(() => poll(), [poll]);

  // Drive start/stop from `enabled`, and clean up on unmount.
  useEffect(() => {
    if (enabled) start();
    else stop();
    return () => {
      activeRef.current = false;
      clearTimer();
      controllerRef.current?.abort();
    };
    // `start`/`stop` are stable w.r.t. these inputs via their own deps.
  }, [enabled, start, stop, clearTimer]);

  return { data, error, isPolling, lastUpdated, start, stop, refresh };
}
