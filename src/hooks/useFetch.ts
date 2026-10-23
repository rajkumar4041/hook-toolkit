import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatest } from './useLatest';
import { useIsMounted } from './useIsMounted';
import { subscribeQuery } from './queryRegistry';
import type { QueryObserver } from './queryRegistry';

export interface UseFetchOptions<T> {
  /** Values that identify this request; refetches when any of them change. */
  queryKey: unknown[];
  /** The async fetcher. Receives an `AbortSignal` — pass it to `fetch` for cancellation. */
  queryFn: (signal: AbortSignal) => Promise<T>;
  /** When `false`, no request is made (and existing data is kept). Defaults to `true`. */
  enabled?: boolean;
  /** Keep the previous data visible while a new key is loading (great for pagination). */
  keepPreviousData?: boolean;
}

export interface UseFetchResult<T> {
  data: T | undefined;
  error: Error | null;
  /** First load with no data yet. */
  isLoading: boolean;
  /** Any request in flight, including a background refetch. */
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  /** Disabled / not yet started. */
  isIdle: boolean;
  /** Re-run the query for the current key. */
  refetch: () => Promise<void>;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * A tiny, typed, TanStack-Query-style data hook — `data` / `error` / loading
 * flags and a `refetch`, driven by a `queryKey` + `queryFn`. Deliberately has
 * **no cache, dedup, retries, or window-focus refetch**: when you need those,
 * use TanStack Query. This covers the common "load this and show loading/error"
 * case with zero dependencies.
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError, refetch } = useFetch({
 *   queryKey: ['user', id],
 *   queryFn: (signal) => fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
 *   enabled: id != null,
 *   keepPreviousData: true, // keep the current page while the next loads
 * });
 * ```
 *
 * Refetches whenever `queryKey` changes, aborts the previous request, and
 * protects against stale responses. SSR-safe (the request runs in an effect).
 */
export function useFetch<T>(options: UseFetchOptions<T>): UseFetchResult<T> {
  const { queryKey, enabled = true, keepPreviousData = false } = options;
  const queryFnRef = useLatest(options.queryFn);
  const isMounted = useIsMounted();

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<Status>(enabled ? 'loading' : 'idle');
  const [isFetching, setIsFetching] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const hasDataRef = useRef(false);
  const serializedKey = JSON.stringify(queryKey ?? []);

  const execute = useCallback(async (): Promise<void> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++requestIdRef.current;
    const isCurrent = () => requestIdRef.current === id && isMounted();

    if (!keepPreviousData && isCurrent()) {
      setData(undefined);
      hasDataRef.current = false;
    }
    setIsFetching(true);
    setStatus((s) => (s === 'success' && keepPreviousData ? s : 'loading'));
    setError(null);

    try {
      const result = await queryFnRef.current(controller.signal);
      if (!isCurrent()) return;
      setData(result);
      hasDataRef.current = true;
      setStatus('success');
      setIsFetching(false);
    } catch (err) {
      if (controller.signal.aborted || !isCurrent()) return;
      setError(toError(err));
      setStatus('error');
      setIsFetching(false);
    }
  }, [keepPreviousData, queryFnRef, isMounted]);

  useEffect(() => {
    if (!enabled) {
      // Disabled: stop any in-flight request, go idle (keep existing data).
      controllerRef.current?.abort();
      setIsFetching(false);
      setStatus((s) => (s === 'loading' ? 'idle' : s));
      return;
    }
    void execute();
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedKey, enabled, execute]);

  const refetch = useCallback(() => execute(), [execute]);

  // Register with the shared registry so `invalidateQueries` / the
  // `useInvalidateQueries` hook can refetch this instance by key. The observer
  // object is stable; its fields are kept current so the registry always sees
  // the latest key and `execute`.
  const observerRef = useRef<QueryObserver>({ queryKey: [], refetch: () => Promise.resolve() });
  observerRef.current.queryKey = queryKey ?? [];
  observerRef.current.refetch = refetch;

  useEffect(() => {
    if (!enabled) return;
    return subscribeQuery(observerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    data,
    error,
    isLoading: isFetching && !hasDataRef.current,
    isFetching,
    isError: status === 'error',
    isSuccess: status === 'success',
    isIdle: status === 'idle',
    refetch,
  };
}
