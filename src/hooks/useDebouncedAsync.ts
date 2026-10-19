import { useEffect, useRef, useState } from 'react';
import { useDebounce } from './useDebounce';
import { useLatest } from './useLatest';
import { useIsMounted } from './useIsMounted';

export interface UseDebouncedAsyncOptions<T, V> {
  /** Debounce delay in milliseconds. Defaults to 400. */
  delay?: number;
  /** Return `false` to skip fetching for a given input (e.g. empty query). */
  enabled?: (value: V) => boolean;
  /** Value used for `data` before the first successful fetch. Defaults to `null`. */
  initialData?: T | null;
}

export interface UseDebouncedAsyncResult<T> {
  data: T | null;
  error: Error | null;
  /** A fetch for the settled value is in flight. */
  isLoading: boolean;
  /** The input has changed but the debounce delay has not elapsed yet. */
  isDebouncing: boolean;
  /** Imperatively discard the current result/error and abort any in-flight fetch. */
  cancel: () => void;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Debounced, cancelable async fetching driven by an input value — the correct
 * foundation for search and autocomplete.
 *
 * It combines three things that are tedious and bug-prone to wire by hand:
 * 1. **Debounce** — waits for typing to settle before fetching.
 * 2. **Cancellation** — aborts the previous request (via `AbortSignal`) when a
 *    newer one starts.
 * 3. **Stale-result protection** — a slow earlier response can never overwrite
 *    a newer one, even if it resolves last.
 *
 * The initial (already-settled) value is fetched immediately; only subsequent
 * *changes* are debounced. Use `enabled` to skip fetching for values you don't
 * want to query (e.g. an empty search box).
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * const { data, isLoading, isDebouncing, error } = useDebouncedAsync(
 *   query,
 *   (q, signal) => fetch(`/api/search?q=${q}`, { signal }).then((r) => r.json()),
 *   { delay: 400, enabled: (q) => q.trim().length > 0 },
 * );
 * ```
 *
 * @param value   The input value (e.g. the search query) that drives fetching.
 * @param fetcher `(value, signal) => Promise<T>`. Pass `signal` to `fetch` to
 *                enable real network cancellation.
 * @param options `delay`, `enabled`, `initialData`.
 */
export function useDebouncedAsync<T, V>(
  value: V,
  fetcher: (value: V, signal: AbortSignal) => Promise<T>,
  options: UseDebouncedAsyncOptions<T, V> = {},
): UseDebouncedAsyncResult<T> {
  const { delay = 400, initialData = null } = options;

  const fetcherRef = useLatest(fetcher);
  const enabledRef = useLatest(options.enabled);
  const isMounted = useIsMounted();

  const debouncedValue = useDebounce(value, delay);
  const isDebouncing = value !== debouncedValue;

  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const enabled = enabledRef.current;
    if (enabled && !enabled(debouncedValue)) {
      // Skipped input: abort anything in flight and clear the loading state.
      controllerRef.current?.abort();
      setIsLoading(false);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++requestIdRef.current;
    const isCurrent = () => requestIdRef.current === id && isMounted();

    setIsLoading(true);
    setError(null);

    fetcherRef
      .current(debouncedValue, controller.signal)
      .then((result) => {
        if (!isCurrent()) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || !isCurrent()) return;
        setError(toError(err));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [debouncedValue, fetcherRef, enabledRef, isMounted]);

  const cancel = () => {
    controllerRef.current?.abort();
    requestIdRef.current++;
    setIsLoading(false);
  };

  return { data, error, isLoading, isDebouncing, cancel };
}
