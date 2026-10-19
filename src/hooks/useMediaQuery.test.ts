import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

type ChangeCb = (e: { matches: boolean }) => void;

/** Install a controllable `window.matchMedia` mock. */
function mockMatchMedia(initial = false) {
  const store = { matches: initial, listeners: new Set<ChangeCb>() };
  window.matchMedia = ((query: string) => ({
    media: query,
    get matches() {
      return store.matches;
    },
    addEventListener: (_type: string, cb: ChangeCb) => store.listeners.add(cb),
    removeEventListener: (_type: string, cb: ChangeCb) => store.listeners.delete(cb),
    addListener: (cb: ChangeCb) => store.listeners.add(cb),
    removeListener: (cb: ChangeCb) => store.listeners.delete(cb),
    dispatchEvent: () => true,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
  return {
    set(matches: boolean) {
      store.matches = matches;
      store.listeners.forEach((cb) => cb({ matches }));
    },
    get listenerCount() {
      return store.listeners.size;
    },
  };
}

describe('useMediaQuery', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the current match state', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', () => {
    const mm = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
    act(() => mm.set(true));
    expect(result.current).toBe(true);
  });

  it('removes its listener on unmount', () => {
    const mm = mockMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(mm.listenerCount).toBe(1);
    unmount();
    expect(mm.listenerCount).toBe(0);
  });

  it('returns defaultValue when matchMedia is unavailable', () => {
    const original = window.matchMedia;
    // @ts-expect-error simulate an environment without matchMedia
    delete window.matchMedia;
    const { result } = renderHook(() =>
      useMediaQuery('(min-width: 768px)', { defaultValue: true }),
    );
    expect(result.current).toBe(true);
    window.matchMedia = original;
  });
});
