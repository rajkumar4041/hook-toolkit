import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatest } from './useLatest';
import { useIsMounted } from './useIsMounted';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/** Resolved outcome of a `run` call. Never rejects, so `await run()` is safe. */
export interface AsyncActionResult<T> {
  data: T | null;
  error: Error | null;
}

export interface UseAsyncActionOptions<T, A extends unknown[]> {
  /** Called after a successful run (only for the most recent, non-stale run). */
  onSuccess?: (data: T, args: A) => void;
  /** Called after a failed run (not called when the run was aborted/superseded). */
  onError?: (error: Error, args: A) => void;
  /**
   * When `false` (default), calling `run` while another run is in flight is
   * ignored and returns the in-flight promise — a built-in double-submit guard.
   * When `true`, a new run starts and aborts the previous one; only the latest
   * run updates state (stale-result protection).
   */
  allowConcurrent?: boolean;
}

export interface UseAsyncAction<T, A extends unknown[]> {
  /** Execute the action. Resolves to `{ data, error }`; never rejects. */
  run: (...args: A) => Promise<AsyncActionResult<T>>;
  data: T | null;
  error: Error | null;
  status: AsyncStatus;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  /** Abort the in-flight run (if any) and return to the previous settled state. */
  cancel: () => void;
  /** Abort any in-flight run and reset to idle with no data/error. */
  reset: () => void;
}

interface State<T> {
  status: AsyncStatus;
  data: T | null;
  error: Error | null;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Wraps an async function with loading/success/error state, a double-submit
 * guard, abort-based cancellation, and stale-result protection.
 *
 * The action function receives an `AbortSignal` as its first argument so it can
 * cancel in-flight work (e.g. `fetch(url, { signal })`). You may ignore it — a
 * plain `() => Promise<T>` is assignable, matching simple cases.
 *
 * @example
 * ```tsx
 * const save = useAsyncAction((signal, body: FormData) =>
 *   fetch('/api/save', { method: 'POST', body, signal }).then((r) => {
 *     if (!r.ok) throw new Error('Save failed');
 *     return r.json();
 *   }),
 * );
 *
 * <button onClick={() => save.run(formData)} disabled={save.isLoading}>
 *   {save.isLoading ? 'Saving…' : 'Save'}
 * </button>
 * {save.isError && <p role="alert">{save.error?.message}</p>}
 * ```
 *
 * ### Concurrency
 * By default overlapping `run` calls are ignored while one is in flight. Set
 * `allowConcurrent: true` to let a new run abort and supersede the previous;
 * only the latest run ever updates state. State updates after unmount are
 * suppressed and the in-flight run is aborted on unmount.
 */
export function useAsyncAction<T, A extends unknown[] = []>(
  fn: (signal: AbortSignal, ...args: A) => Promise<T>,
  options: UseAsyncActionOptions<T, A> = {},
): UseAsyncAction<T, A> {
  const { allowConcurrent = false } = options;

  const fnRef = useLatest(fn);
  const onSuccessRef = useLatest(options.onSuccess);
  const onErrorRef = useLatest(options.onError);
  const isMounted = useIsMounted();

  const [state, setState] = useState<State<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<Promise<AsyncActionResult<T>> | null>(null);

  const run = useCallback(
    (...args: A): Promise<AsyncActionResult<T>> => {
      if (!allowConcurrent && inFlightRef.current) {
        return inFlightRef.current;
      }
      // Supersede any previous run so only the latest result wins.
      controllerRef.current?.abort();

      const controller = new AbortController();
      controllerRef.current = controller;
      const id = ++requestIdRef.current;
      const isCurrent = () => requestIdRef.current === id && isMounted();

      setState((s) => ({ status: 'loading', data: s.data, error: null }));

      const exec = async (): Promise<AsyncActionResult<T>> => {
        try {
          const data = await fnRef.current(controller.signal, ...args);
          if (isCurrent()) {
            setState({ status: 'success', data, error: null });
            onSuccessRef.current?.(data, args);
          }
          return { data, error: null };
        } catch (err) {
          const error = toError(err);
          // Aborted/superseded runs must not clobber newer state.
          if (!controller.signal.aborted && isCurrent()) {
            setState({ status: 'error', data: null, error });
            onErrorRef.current?.(error, args);
          }
          return { data: null, error };
        }
      };

      const promise = exec();
      inFlightRef.current = promise;
      void promise.finally(() => {
        if (inFlightRef.current === promise) inFlightRef.current = null;
      });
      return promise;
    },
    [allowConcurrent, fnRef, onSuccessRef, onErrorRef, isMounted],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlightRef.current = null;
    // Leave any prior data; just stop the loading state.
    setState((s) => (s.status === 'loading' ? { ...s, status: s.data !== null ? 'success' : 'idle' } : s));
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlightRef.current = null;
    requestIdRef.current++;
    setState({ status: 'idle', data: null, error: null });
  }, []);

  // Abort any in-flight work when the component unmounts.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return {
    run,
    data: state.data,
    error: state.error,
    status: state.status,
    isIdle: state.status === 'idle',
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    cancel,
    reset,
  };
}
