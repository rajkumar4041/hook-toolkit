import { useRef } from 'react';
import { useIsomorphicLayoutEffect } from '../utils/useIsomorphicLayoutEffect';
import { isBrowser } from '../utils/isBrowser';

export interface UseDocumentTitleOptions {
  /** Restore the title that was present when the hook mounted, on unmount. Defaults to `false`. */
  restoreOnUnmount?: boolean;
}

/**
 * Sets `document.title` and keeps it in sync with the given string.
 *
 * @example
 * ```tsx
 * useDocumentTitle(`Inbox (${unread}) — Acme`);
 * ```
 *
 * SSR-safe (the title is only written in the browser). Set
 * `restoreOnUnmount` to put the previous title back when the component unmounts
 * — useful for modal/route-scoped titles.
 *
 * @param title   The title to display.
 * @param options `restoreOnUnmount`.
 */
export function useDocumentTitle(title: string, options: UseDocumentTitleOptions = {}): void {
  const { restoreOnUnmount = false } = options;
  const previousRef = useRef<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!isBrowser) return;
    if (previousRef.current === null) previousRef.current = document.title;
    document.title = title;
  }, [title]);

  useIsomorphicLayoutEffect(() => {
    if (!isBrowser) return;
    return () => {
      if (restoreOnUnmount && previousRef.current !== null) {
        document.title = previousRef.current;
      }
    };
    // Intentionally run once: capture restore behavior for the unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
