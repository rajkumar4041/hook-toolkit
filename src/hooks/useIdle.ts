import { useEffect, useRef, useState } from 'react';
import { useLatest } from './useLatest';
import { isBrowser } from '../utils/isBrowser';

export interface UseIdleOptions {
  /** Activity events that reset the idle timer. Defaults to common pointer/keyboard/scroll/touch events. */
  events?: string[];
  /** Initial idle state before any activity is observed. Defaults to false. */
  initialState?: boolean;
  /** Called when the user transitions to idle. */
  onIdle?: () => void;
  /** Called when the user transitions back to active. */
  onActive?: () => void;
}

const DEFAULT_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
  'resize',
];

/**
 * Reports whether the user has been inactive for `timeout` milliseconds — for
 * auto-logout, pausing polling, dimming a screen, or "are you still there?"
 * prompts.
 *
 * Any watched activity event resets the timer and flips the state back to
 * active (firing `onActive`). SSR-safe: returns `initialState` on the server and
 * starts the timer after mount.
 *
 * @example
 * ```tsx
 * const idle = useIdle(60_000, { onIdle: () => logout() });
 * ```
 *
 * @param timeout Inactivity threshold in milliseconds.
 * @param options `events`, `initialState`, `onIdle`, `onActive`.
 * @returns `true` once the user has been idle for `timeout` ms.
 */
export function useIdle(timeout: number, options: UseIdleOptions = {}): boolean {
  const { initialState = false } = options;
  const [idle, setIdle] = useState(initialState);

  const onIdleRef = useLatest(options.onIdle);
  const onActiveRef = useLatest(options.onActive);
  const idleRef = useRef(idle);
  idleRef.current = idle;

  const events = options.events ?? DEFAULT_EVENTS;
  // Stable string key so changing the array literal each render does not re-bind.
  const eventsKey = events.join(',');

  useEffect(() => {
    if (!isBrowser) return;

    let timer: ReturnType<typeof setTimeout>;

    const goIdle = () => {
      if (idleRef.current) return;
      setIdle(true);
      onIdleRef.current?.();
    };

    const onActivity = () => {
      if (idleRef.current) {
        setIdle(false);
        onActiveRef.current?.();
      }
      clearTimeout(timer);
      timer = setTimeout(goIdle, timeout);
    };

    const types = eventsKey.split(',');
    types.forEach((type) => window.addEventListener(type, onActivity, { passive: true }));
    timer = setTimeout(goIdle, timeout);

    return () => {
      clearTimeout(timer);
      types.forEach((type) => window.removeEventListener(type, onActivity));
    };
  }, [timeout, eventsKey, onIdleRef, onActiveRef]);

  return idle;
}
