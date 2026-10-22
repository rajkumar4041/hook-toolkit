import { useEffect, useRef, type RefObject } from 'react';
import { useLatest } from './useLatest';
import { isBrowser } from '../utils/isBrowser';

export interface UseInfiniteScrollOptions {
  /** Pause loading (e.g. while already fetching or when no more pages). Defaults to `true`. */
  enabled?: boolean;
  /** Margin around the root, e.g. `'200px'` to load before the sentinel is fully visible. */
  rootMargin?: string;
  /** Scroll container; defaults to the browser viewport. */
  root?: Element | null;
  /** Intersection ratio that triggers a load. Defaults to 0. */
  threshold?: number;
}

export interface UseInfiniteScrollResult<T> {
  /** Attach to a sentinel element at the end of your list. */
  ref: RefObject<T>;
}

/**
 * Calls `onLoadMore` when a sentinel element scrolls into view — the standard
 * way to implement infinite scrolling. Built on `IntersectionObserver`.
 *
 * @example
 * ```tsx
 * const { ref } = useInfiniteScroll(() => loadNextPage(), {
 *   enabled: hasMore && !isLoading,
 *   rootMargin: '200px',
 * });
 * return (
 *   <ul>
 *     {items.map((i) => <li key={i.id}>{i.name}</li>)}
 *     <li ref={ref} aria-hidden /> {/* sentinel *\/}
 *   </ul>
 * );
 * ```
 *
 * `onLoadMore` fires once each time the sentinel transitions into view (not
 * repeatedly while it stays visible). Always gate `enabled` on your loading and
 * has-more flags to avoid duplicate loads. SSR-safe.
 *
 * @param onLoadMore Called when more content should load.
 * @param options    `enabled`, `root`, `rootMargin`, `threshold`.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLElement>(
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions = {},
): UseInfiniteScrollResult<T> {
  const { enabled = true, rootMargin, root = null, threshold = 0 } = options;
  const ref = useRef<T>(null);
  const onLoadMoreRef = useLatest(onLoadMore);
  const wasIntersectingRef = useRef(false);
  const optionsKey = `${rootMargin ?? ''}|${threshold}`;

  useEffect(() => {
    if (!isBrowser || !enabled) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        // Fire only on the false -> true transition.
        if (entry.isIntersecting && !wasIntersectingRef.current) {
          onLoadMoreRef.current();
        }
        wasIntersectingRef.current = entry.isIntersecting;
      },
      { root: root ?? null, rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, root, optionsKey, onLoadMoreRef]);

  return { ref };
}
