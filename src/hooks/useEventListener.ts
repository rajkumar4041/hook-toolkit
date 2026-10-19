import { useEffect, type RefObject } from 'react';
import { useLatest } from './useLatest';
import { isBrowser } from '../utils/isBrowser';

/**
 * Attaches an event listener and cleans it up automatically.
 *
 * The handler always sees current props/state (no stale closures) and is not
 * part of the effect dependencies, so the listener is attached once and not
 * re-bound every render. SSR-safe: does nothing when there is no DOM.
 *
 * Overloads provide correctly typed event objects for `window`, `document`,
 * `MediaQueryList`, and element refs.
 *
 * @example
 * ```tsx
 * useEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
 *
 * const ref = useRef<HTMLDivElement>(null);
 * useEventListener('click', onClick, ref);
 * ```
 */

// Window (default target)
export function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  target?: Window | null,
  options?: boolean | AddEventListenerOptions,
): void;

// Document
export function useEventListener<K extends keyof DocumentEventMap>(
  type: K,
  handler: (event: DocumentEventMap[K]) => void,
  target: Document | null,
  options?: boolean | AddEventListenerOptions,
): void;

// Element ref
export function useEventListener<
  K extends keyof HTMLElementEventMap,
  T extends HTMLElement = HTMLElement,
>(
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  target: RefObject<T | null>,
  options?: boolean | AddEventListenerOptions,
): void;

// MediaQueryList
export function useEventListener<K extends keyof MediaQueryListEventMap>(
  type: K,
  handler: (event: MediaQueryListEventMap[K]) => void,
  target: MediaQueryList | null,
  options?: boolean | AddEventListenerOptions,
): void;

export function useEventListener(
  type: string,
  handler: (event: Event) => void,
  target?: Window | Document | MediaQueryList | RefObject<HTMLElement | null> | null,
  options?: boolean | AddEventListenerOptions,
): void {
  const savedHandler = useLatest(handler);

  useEffect(() => {
    if (!isBrowser) return;

    const resolved: EventTarget | null | undefined =
      target && 'current' in target ? target.current : (target ?? window);

    if (!resolved || typeof resolved.addEventListener !== 'function') return;

    const listener = (event: Event) => savedHandler.current(event);
    resolved.addEventListener(type, listener, options);
    return () => resolved.removeEventListener(type, listener, options);
    // `target` may be a ref object (stable) or an element/window.
    // `options` is included so re-passing a new options object re-binds.
  }, [type, target, options, savedHandler]);
}
