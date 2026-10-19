import { useEffect, useRef } from 'react';

/**
 * Returns the value from the previous render, or `undefined` on first render.
 *
 * @example
 * ```tsx
 * const prevCount = usePrevious(count);
 * // prevCount is the count from the render before this one
 * ```
 *
 * The update happens in an effect, so during render `usePrevious` reflects the
 * value as of the last committed render — the standard, correct behavior for
 * comparing "current vs previous" props or state.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
