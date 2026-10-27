import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatest } from './useLatest';
import { isBrowser } from '../utils/isBrowser';

export interface UseEventSourceProps<T> {
  /** Server-Sent Events endpoint URL. */
  url: string;
  /**
   * Called for every default (`message`) event received. Always the latest
   * callback (no stale closures).
   */
  onMessage?: (event: MessageEvent<T>) => void;
  /**
   * Handlers for named SSE events (`event: <name>` lines), keyed by event name.
   * Each handler is always called with the latest version you passed. Adding or
   * removing a name reopens the connection; changing a handler function does not.
   */
  events?: Record<string, (event: MessageEvent<T>) => void>;
  /** Send credentials (cookies) with the request. Defaults to `false`. */
  withCredentials?: boolean;
  /** Skip connecting on mount; connect later via `reconnect`. Defaults to `false`. */
  disableInitialConnection?: boolean;
}

export interface UseEventSourceReturn<T> {
  /** The most recent default-event payload (raw `data` string), or `null`. */
  data: T | null;
  /** `true` while the stream is open. */
  isConnected: boolean;
  /** The most recent connection error, or `null`. */
  error: Error | null;
  /** Close the current stream (if any) and open a fresh connection. */
  reconnect: () => void;
  /** Close the current connection. */
  close: () => void;
}

/**
 * Subscribes to a Server-Sent Events stream via the native `EventSource`, with
 * connection state, error handling, named-event listeners, and automatic
 * cleanup — without the stale-closure and missing-handler bugs that hand-rolled
 * versions tend to have.
 *
 * @example
 * ```tsx
 * const { data, isConnected, error } = useEventSource<string>({
 *   url: '/api/prices',
 *   onMessage: (e) => console.log('tick', e.data),
 *   events: { price: (e) => updatePrice(e.data) },
 * });
 * ```
 *
 * ### Notes & limitations
 * - **SSR-safe:** the stream is created in an effect, which never runs on the
 *   server; a missing `EventSource` global is handled gracefully.
 * - **Receive-only.** SSE is one-way; there is no send. Use `useWebSocket` for
 *   bidirectional communication.
 * - `data` holds the raw `data` string of the latest default event. SSE payloads
 *   are always text — `JSON.parse` in your handler if the server sends JSON.
 * - The browser reconnects dropped SSE streams on its own. `reconnect`/`close`
 *   are for manual control; the connection also reopens if `url`,
 *   `withCredentials`, or the set of `events` names changes, and closes on unmount.
 *
 * @param props `url`, `onMessage`, `events`, `withCredentials`, `disableInitialConnection`.
 */
export function useEventSource<T = string>({
  url,
  onMessage,
  events,
  withCredentials = false,
  disableInitialConnection = false,
}: UseEventSourceProps<T>): UseEventSourceReturn<T> {
  const onMessageRef = useLatest(onMessage);
  const eventsRef = useLatest(events);
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  // Reopen only when the set of event names changes, not on every render.
  const eventNamesKey = Object.keys(events ?? {})
    .sort()
    .join(',');

  // Single source of truth for wiring a connection, reused by mount + reconnect.
  const connect = useCallback(() => {
    if (!isBrowser || typeof EventSource === 'undefined') return;

    sourceRef.current?.close();
    setError(null);

    const source = new EventSource(url, { withCredentials });
    sourceRef.current = source;

    source.onopen = () => setIsConnected(true);
    source.onmessage = (event) => {
      const typed = event as MessageEvent<T>;
      setData(typed.data);
      onMessageRef.current?.(typed);
    };
    source.onerror = () => {
      setIsConnected(false);
      setError(new Error(`EventSource error (${url})`));
    };

    for (const name of eventNamesKey ? eventNamesKey.split(',') : []) {
      source.addEventListener(name, (event) => {
        eventsRef.current?.[name]?.(event as MessageEvent<T>);
      });
    }
  }, [url, withCredentials, eventNamesKey, onMessageRef, eventsRef]);

  useEffect(() => {
    if (!disableInitialConnection) connect();
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [connect, disableInitialConnection]);

  const reconnect = useCallback(() => connect(), [connect]);

  const close = useCallback(() => {
    sourceRef.current?.close();
    setIsConnected(false);
  }, []);

  return { data, isConnected, error, reconnect, close };
}
