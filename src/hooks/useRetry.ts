import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatest } from './useLatest';
import { useIsMounted } from './useIsMounted';

export type RetryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseRetryOptions {
  /** Max retry attempts after the first try. Defaults to 3. */
  retries?: number;
  /** Base delay between attempts, in ms. Defaults to 500. */
  delay?: number;
  /** Exponential multiplier applied per attempt. Defaults to 2. */
  backoff?: number;
  /** Called before each retry with the error and the upcoming attempt number (1-based). */
  onRetry?: (error: Error, attempt: number) => void;
  /** Decide whether to retry a given error. Defaults to always retry. */
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface UseRetry<T, A extends unknown[]> {
  /** Run the action, retrying on failure. Resolves `{ data, error }`; never rejects. */
  run: (...args: A) => Promise<{ data: T | null; error: Error | null }>;
  data: T | null;
  error: Error | null;
  status: RetryStatus;
  /** Number of attempts made for the latest run (1 = succeeded first try). */
  attempt: number;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** Abort the in-flight run (including a pending backoff wait). */
  cancel: () => void;
  /** Reset to idle and clear data/error. */
  reset: () => void;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/** A delay that rejects immediately if the signal aborts. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/**
 * Runs an async action and automatically retries it on failure with
 * configurable attempts and exponential backoff.
 *
 * @example
 * ```tsx
 * const { run, isLoading, attempt, error } = useRetry(
 *   (signal) => fetch('/api/flaky', { signal }).then((r) => {
 *     if (!r.ok) throw new Error('Request failed');
 *     return r.json();
 *   }),
 *   { retries: 4, delay: 400, backoff: 2 },
 * );
 * ```
 *
 * The action receives an `AbortSignal` first (ignore it if unneeded). `run`
 * never rejects — it resolves `{ data, error }` and mirrors state. The in-flight
 * run (including a pending backoff wait) is aborted on `cancel` and on unmount.
 *
 * @param fn      `(signal, ...args) => Promise<T>`.
 * @param options `retries`, `delay`, `backoff`, `onRetry`, `shouldRetry`.
 */
export function useRetry<T, A extends unknown[] = []>(
  fn: (signal: AbortSignal, ...args: A) => Promise<T>,
  options: UseRetryOptions = {},
): UseRetry<T, A> {
  const { retries = 3, delay = 500, backoff = 2 } = options;
  const fnRef = useLatest(fn);
  const onRetryRef = useLatest(options.onRetry);
  const shouldRetryRef = useLatest(options.shouldRetry);
  const isMounted = useIsMounted();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<RetryStatus>('idle');
  const [attempt, setAttempt] = useState(0);

  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const run = useCallback(
    async (...args: A): Promise<{ data: T | null; error: Error | null }> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const id = ++requestIdRef.current;
      const isCurrent = () => requestIdRef.current === id && isMounted();

      if (isCurrent()) {
        setStatus('loading');
        setError(null);
        setAttempt(0);
      }

      let lastError: Error | null = null;
      for (let tryIndex = 0; tryIndex <= retries; tryIndex++) {
        if (controller.signal.aborted) break;
        if (isCurrent()) setAttempt(tryIndex + 1);
        try {
          const result = await fnRef.current(controller.signal, ...args);
          if (isCurrent()) {
            setData(result);
            setStatus('success');
          }
          return { data: result, error: null };
        } catch (err) {
          lastError = toError(err);
          if (controller.signal.aborted) break;
          const nextAttempt = tryIndex + 1;
          const canRetry =
            tryIndex < retries && (shouldRetryRef.current?.(lastError, nextAttempt) ?? true);
          if (!canRetry) break;
          onRetryRef.current?.(lastError, nextAttempt);
          try {
            await sleep(delay * backoff ** tryIndex, controller.signal);
          } catch {
            break; // aborted during backoff
          }
        }
      }

      if (!controller.signal.aborted && isCurrent() && lastError) {
        setError(lastError);
        setStatus('error');
      }
      return { data: null, error: lastError };
    },
    [retries, delay, backoff, fnRef, onRetryRef, shouldRetryRef, isMounted],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus((s) => (s === 'loading' ? 'idle' : s));
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    requestIdRef.current++;
    setData(null);
    setError(null);
    setStatus('idle');
    setAttempt(0);
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return {
    run,
    data,
    error,
    status,
    attempt,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    cancel,
    reset,
  };
}
