import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a stable function that reports whether the component is still mounted.
 *
 * Use it to guard state updates after an `await` so you never call a setter on
 * an unmounted component.
 *
 * @example
 * ```tsx
 * const isMounted = useIsMounted();
 * const load = async () => {
 *   const data = await fetchData();
 *   if (isMounted()) setData(data);
 * };
 * ```
 *
 * The returned function identity is stable for the component's lifetime, so it
 * is safe to omit from dependency arrays. Strict Mode remount is handled: the
 * ref is reset to `true` on every mount.
 */
export function useIsMounted(): () => boolean {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}
