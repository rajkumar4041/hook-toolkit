import { useRef } from 'react';

/**
 * Returns a ref whose `.current` always holds the most recent value passed in.
 *
 * Use this to read the latest value inside callbacks, timers, event listeners,
 * or async code without adding the value to a dependency array and without
 * capturing a stale closure.
 *
 * @example
 * ```tsx
 * const latestOnChange = useLatest(onChange);
 * useEffect(() => {
 *   const id = setInterval(() => latestOnChange.current(), 1000);
 *   return () => clearInterval(id);
 * }, []); // interval set up once, always calls the newest onChange
 * ```
 *
 * The ref is updated during render (not in an effect) so the latest value is
 * available synchronously, including before effects of child components run.
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
