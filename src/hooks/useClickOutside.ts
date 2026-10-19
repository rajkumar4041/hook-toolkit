import { useEffect, type RefObject } from 'react';
import { useLatest } from './useLatest';
import { isBrowser } from '../utils/isBrowser';

export interface UseClickOutsideOptions {
  /** Disable the listener without unmounting. Defaults to `true`. */
  enabled?: boolean;
  /** Events that count as an "outside" interaction. Defaults to mousedown + touchstart. */
  events?: Array<'mousedown' | 'mouseup' | 'click' | 'touchstart' | 'touchend'>;
}

/**
 * Calls `handler` when a pointer/touch interaction happens outside the
 * referenced element — the standard way to close dropdowns, popovers, and menus.
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * useClickOutside(ref, () => setOpen(false));
 * return <div ref={ref}>{open && <Menu />}</div>;
 * ```
 *
 * Listens on `mousedown`/`touchstart` by default (fires before `click`, so the
 * menu closes before a click handler elsewhere runs). SSR-safe. The handler may
 * change every render without re-binding the listener.
 *
 * @param ref     Ref to the element considered "inside".
 * @param handler Called with the triggering event when the interaction is outside.
 * @param options `enabled`, `events`.
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  options: UseClickOutsideOptions = {},
): void {
  const { enabled = true } = options;
  const handlerRef = useLatest(handler);
  const events = options.events ?? (['mousedown', 'touchstart'] as const);
  // Stable string key so changing the array literal each render does not re-bind.
  const eventsKey = events.join(',');

  useEffect(() => {
    if (!isBrowser || !enabled) return;
    const listener = (event: Event) => {
      const el = ref.current;
      const target = event.target as Node | null;
      if (!el || !target || el.contains(target)) return;
      handlerRef.current(event as MouseEvent | TouchEvent);
    };
    const types = eventsKey.split(',');
    types.forEach((type) => document.addEventListener(type, listener, true));
    return () => types.forEach((type) => document.removeEventListener(type, listener, true));
  }, [ref, enabled, eventsKey, handlerRef]);
}
