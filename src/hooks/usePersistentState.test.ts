import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('uses the initial value when nothing is stored', () => {
    const { result } = renderHook(() => usePersistentState('k', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('reads an existing stored value', () => {
    localStorage.setItem('k', JSON.stringify('stored'));
    const { result } = renderHook(() => usePersistentState('k', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('writes updates to storage', () => {
    const { result } = renderHook(() => usePersistentState('k', 0));
    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    expect(localStorage.getItem('k')).toBe('5');
  });

  it('supports the updater function form', () => {
    const { result } = renderHook(() => usePersistentState('k', 10));
    act(() => result.current[1]((n) => n + 1));
    expect(result.current[0]).toBe(11);
  });

  it('remove() deletes the key and reverts to the initial value', () => {
    const { result } = renderHook(() => usePersistentState('k', 'default'));
    act(() => result.current[1]('changed'));
    expect(localStorage.getItem('k')).not.toBeNull();
    act(() => result.current[2]());
    expect(localStorage.getItem('k')).toBeNull();
    expect(result.current[0]).toBe('default');
  });

  it('keeps two hooks on the same key in sync within a tab', () => {
    const { result: a } = renderHook(() => usePersistentState('shared', 'x'));
    const { result: b } = renderHook(() => usePersistentState('shared', 'x'));
    act(() => a.current[1]('y'));
    expect(a.current[0]).toBe('y');
    expect(b.current[0]).toBe('y');
  });

  it('reacts to a cross-tab storage event', () => {
    const { result } = renderHook(() => usePersistentState('k', 'a'));
    act(() => {
      localStorage.setItem('k', JSON.stringify('fromOtherTab'));
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'k', newValue: JSON.stringify('fromOtherTab') }),
      );
    });
    expect(result.current[0]).toBe('fromOtherTab');
  });

  it('supports sessionStorage', () => {
    const { result } = renderHook(() => usePersistentState('s', 1, { storage: 'session' }));
    act(() => result.current[1](9));
    expect(sessionStorage.getItem('s')).toBe('9');
    expect(localStorage.getItem('s')).toBeNull();
  });

  it('falls back to initial value and reports error on corrupt JSON', () => {
    localStorage.setItem('k', '{not valid json');
    const onError = vi.fn();
    const { result } = renderHook(() => usePersistentState('k', 'safe', { onError }));
    expect(result.current[0]).toBe('safe');
    expect(onError).toHaveBeenCalled();
  });

  it('works with object values', () => {
    const { result } = renderHook(() => usePersistentState('obj', { count: 0 }));
    act(() => result.current[1]({ count: 2 }));
    expect(result.current[0]).toEqual({ count: 2 });
    expect(JSON.parse(localStorage.getItem('obj')!)).toEqual({ count: 2 });
  });
});

describe('usePersistentState (SSR)', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    vi.resetModules();
    (globalThis as { window?: Window }).window = originalWindow;
  });

  it('returns the initial value when there is no window (server render)', async () => {
    vi.resetModules();
    // Simulate a server environment where `window` is undefined.
    (globalThis as { window?: Window }).window = undefined as unknown as Window;
    const mod = await import('./usePersistentState');
    const { renderHook: rh } = await import('@testing-library/react');
    // renderHook needs a DOM to mount, so restore window for the renderer only
    // after the module captured isBrowser === false at import time.
    (globalThis as { window?: Window }).window = originalWindow;
    const { result } = rh(() => mod.usePersistentState('ssr', 'initial'));
    expect(result.current[0]).toBe('initial');
  });
});
