import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatest } from './useLatest';
import { isBrowser } from '../utils/isBrowser';

/** Data types accepted by `WebSocket.send`. */
export type WebSocketSendable = string | ArrayBufferLike | Blob | ArrayBufferView;

export interface UseWebSocketProps<T> {
  /** WebSocket server URL (`ws://` or `wss://`). */
  url: string;
  /** Called for every message received. Always the latest callback (no stale closures). */
  onMessageReceived?: (event: MessageEvent<T>) => void;
  /** Skip connecting on mount; connect later via `reconnect`. Defaults to `false`. */
  disableInitialConnection?: boolean;
}

export interface UseWebSocketReturn {
  /** `true` while the socket is open. */
  isConnected: boolean;
  /** The most recent connection error, or `null`. */
  error: Error | null;
  /** Send data if the socket is open. Returns `true` if sent, `false` if dropped. */
  sendData: (data: WebSocketSendable) => boolean;
  /** Close the current socket (if any) and open a fresh connection. */
  reconnect: () => void;
  /** Close the current connection. */
  closeConnection: () => void;
}

/**
 * Manages a WebSocket connection with connection state, error handling, send,
 * reconnect, and automatic cleanup — without the stale-closure and
 * missing-handler bugs that hand-rolled versions tend to have.
 *
 * @example
 * ```tsx
 * const { isConnected, sendData, error, reconnect } = useWebSocket<ChatMessage>({
 *   url: 'wss://example.com/chat',
 *   onMessageReceived: (e) => appendMessage(e.data),
 * });
 *
 * <button disabled={!isConnected} onClick={() => sendData(JSON.stringify(msg))}>Send</button>
 * ```
 *
 * ### Notes & limitations
 * - **SSR-safe:** the socket is created in an effect, which never runs on the
 *   server; a missing `WebSocket` global is handled gracefully.
 * - **Frames sent before the socket opens are dropped** (`sendData` returns
 *   `false`), not queued — gate sending on `isConnected`.
 * - The connection is re-established if `url` changes, and closed on unmount.
 * - This hook does not auto-reconnect on drop; call `reconnect` yourself (e.g.
 *   with your own backoff) if you need that.
 *
 * @param props `url`, `onMessageReceived`, `disableInitialConnection`.
 */
export function useWebSocket<T = unknown>({
  url,
  onMessageReceived,
  disableInitialConnection = false,
}: UseWebSocketProps<T>): UseWebSocketReturn {
  const onMessageRef = useLatest(onMessageReceived);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Single source of truth for wiring a connection, reused by mount + reconnect.
  const connect = useCallback(() => {
    if (!isBrowser || typeof WebSocket === 'undefined') return;

    wsRef.current?.close();
    setError(null);

    const socket = new WebSocket(url);
    wsRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => setIsConnected(false);
    socket.onmessage = (event) => onMessageRef.current?.(event as MessageEvent<T>);
    socket.onerror = () => setError(new Error(`WebSocket error (${url})`));
  }, [url, onMessageRef]);

  useEffect(() => {
    if (!disableInitialConnection) connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, disableInitialConnection]);

  const sendData = useCallback((data: WebSocketSendable): boolean => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
      return true;
    }
    return false;
  }, []);

  const reconnect = useCallback(() => connect(), [connect]);

  const closeConnection = useCallback(() => {
    wsRef.current?.close();
  }, []);

  return { isConnected, error, sendData, reconnect, closeConnection };
}
