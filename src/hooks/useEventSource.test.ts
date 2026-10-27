import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEventSource } from './useEventSource';

/** Minimal controllable EventSource stand-in for jsdom. */
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static instances: MockEventSource[] = [];

  url: string;
  withCredentials: boolean;
  readyState = MockEventSource.CONNECTING;
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  listeners: Record<string, Array<(e: MessageEvent) => void>> = {};

  constructor(url: string, init?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = init?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (e: MessageEvent) => void) {
    (this.listeners[type] ??= []).push(cb);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.(new Event('open'));
  }
  simulateMessage(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
  simulateNamedEvent(type: string, data: string) {
    (this.listeners[type] ?? []).forEach((cb) => cb(new MessageEvent(type, { data })));
  }
  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

const lastSource = (): MockEventSource => {
  const source = MockEventSource.instances[MockEventSource.instances.length - 1];
  if (!source) throw new Error('No MockEventSource instance was created');
  return source;
};

describe('useEventSource', () => {
  let original: typeof EventSource | undefined;

  beforeEach(() => {
    MockEventSource.instances = [];
    original = globalThis.EventSource;
    (globalThis as { EventSource: unknown }).EventSource = MockEventSource;
  });

  afterEach(() => {
    (globalThis as { EventSource: unknown }).EventSource = original;
    vi.restoreAllMocks();
  });

  it('connects on mount with the given url', () => {
    renderHook(() => useEventSource({ url: '/api/stream' }));
    expect(MockEventSource.instances).toHaveLength(1);
    expect(lastSource().url).toBe('/api/stream');
  });

  it('does not connect when disableInitialConnection is true', () => {
    renderHook(() => useEventSource({ url: '/api/stream', disableInitialConnection: true }));
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('reflects the connection state', () => {
    const { result } = renderHook(() => useEventSource({ url: '/api/stream' }));
    expect(result.current.isConnected).toBe(false);
    act(() => lastSource().simulateOpen());
    expect(result.current.isConnected).toBe(true);
  });

  it('exposes the latest message payload as data', () => {
    const { result } = renderHook(() => useEventSource({ url: '/api/stream' }));
    act(() => lastSource().simulateMessage('first'));
    expect(result.current.data).toBe('first');
    act(() => lastSource().simulateMessage('second'));
    expect(result.current.data).toBe('second');
  });

  it('invokes the latest onMessage callback', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ cb }) => useEventSource({ url: '/api/stream', onMessage: cb }),
      { initialProps: { cb: first } },
    );
    rerender({ cb: second });
    act(() => lastSource().simulateMessage('hi'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(second.mock.calls[0]![0].data).toBe('hi');
  });

  it('subscribes to named events', () => {
    const onPrice = vi.fn();
    renderHook(() => useEventSource({ url: '/api/stream', events: { price: onPrice } }));
    act(() => lastSource().simulateNamedEvent('price', '42'));
    expect(onPrice).toHaveBeenCalledTimes(1);
    expect(onPrice.mock.calls[0]![0].data).toBe('42');
  });

  it('passes withCredentials to the EventSource', () => {
    renderHook(() => useEventSource({ url: '/api/stream', withCredentials: true }));
    expect(lastSource().withCredentials).toBe(true);
  });

  it('captures errors as an Error instance', () => {
    const { result } = renderHook(() => useEventSource({ url: '/api/stream' }));
    act(() => lastSource().simulateError());
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('reconnect() opens a fresh source', () => {
    const { result } = renderHook(() => useEventSource({ url: '/api/stream' }));
    expect(MockEventSource.instances).toHaveLength(1);
    act(() => result.current.reconnect());
    expect(MockEventSource.instances).toHaveLength(2);
  });

  it('close() closes the connection', () => {
    const { result } = renderHook(() => useEventSource({ url: '/api/stream' }));
    const source = lastSource();
    act(() => result.current.close());
    expect(source.readyState).toBe(MockEventSource.CLOSED);
  });

  it('closes the source on unmount', () => {
    const { unmount } = renderHook(() => useEventSource({ url: '/api/stream' }));
    const source = lastSource();
    unmount();
    expect(source.readyState).toBe(MockEventSource.CLOSED);
  });
});
