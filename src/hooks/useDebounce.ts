import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `value` has
 * stopped changing for `delayMs`.
 *
 * Ideal for throttling expensive work (search, validation, API calls) driven
 * by a rapidly changing input.
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebounce(query, 400);
 * useEffect(() => { if (debouncedQuery) search(debouncedQuery); }, [debouncedQuery]);
 * ```
 *
 * @param value   The value to debounce.
 * @param delayMs Delay in milliseconds. Defaults to 300.
 * @returns The latest value, delayed until changes settle.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
