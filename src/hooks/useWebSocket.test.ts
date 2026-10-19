import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';

/** Minimal controllable WebSocket stand-in for jsdom. */
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.CONNECTING;
  sent: unknown[] = [];
  onopen: ((e: Event) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: unknown) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }
  simulateMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

const lastSocket = (): MockWebSocket => {
  const socket = MockWebSocket.instances[MockWebSocket.instances.length - 1];
  if (!socket) throw new Error('No MockWebSocket instance was created');
  return socket;
};

describe('useWebSocket', () => {
  let original: typeof WebSocket | undefined;

  beforeEach(() => {
    MockWebSocket.instances = [];
    original = globalThis.WebSocket;
    (globalThis as { WebSocket: unknown }).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    (globalThis as { WebSocket: unknown }).WebSocket = original;
    vi.restoreAllMocks();
  });

  it('connects on mount with the given url', () => {
    renderHook(() => useWebSocket({ url: 'wss://x/chat' }));
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(lastSocket().url).toBe('wss://x/chat');
  });

  it('does not connect when disableInitialConnection is true', () => {
    renderHook(() => useWebSocket({ url: 'wss://x', disableInitialConnection: true }));
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('reflects the connection state', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'wss://x' }));
    expect(result.current.isConnected).toBe(false);
    act(() => lastSocket().simulateOpen());
    expect(result.current.isConnected).toBe(true);
    act(() => lastSocket().close());
    expect(result.current.isConnected).toBe(false);
  });

  it('invokes the latest onMessageReceived callback', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ cb }) => useWebSocket({ url: 'wss://x', onMessageReceived: cb }),
      {
        initialProps: { cb: first },
      },
    );
    rerender({ cb: second });
    act(() => lastSocket().simulateMessage('hi'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(second.mock.calls[0]![0].data).toBe('hi');
  });

  it('sendData sends when open and reports delivery', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'wss://x' }));
    // Not open yet: dropped.
    let sent!: boolean;
    act(() => {
      sent = result.current.sendData('early');
    });
    expect(sent).toBe(false);
    act(() => lastSocket().simulateOpen());
    act(() => {
      sent = result.current.sendData('hello');
    });
    expect(sent).toBe(true);
    expect(lastSocket().sent).toEqual(['hello']);
  });

  it('captures errors as an Error instance', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'wss://x' }));
    act(() => lastSocket().simulateError());
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('reconnect() opens a fresh socket', () => {
    const { result } = renderHook(() => useWebSocket({ url: 'wss://x' }));
    expect(MockWebSocket.instances).toHaveLength(1);
    act(() => result.current.reconnect());
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it('closes the socket on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket({ url: 'wss://x' }));
    const socket = lastSocket();
    unmount();
    expect(socket.readyState).toBe(MockWebSocket.CLOSED);
  });
});
