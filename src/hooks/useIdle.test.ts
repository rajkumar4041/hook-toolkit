import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdle } from './useIdle';

describe('useIdle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('becomes idle after the timeout', () => {
    const { result } = renderHook(() => useIdle(1000));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(true);
  });

  it('resets on activity and fires callbacks', () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const { result } = renderHook(() => useIdle(1000, { onIdle, onActive }));

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(true);
    expect(onIdle).toHaveBeenCalledTimes(1);

    act(() => window.dispatchEvent(new Event('mousemove')));
    expect(result.current).toBe(false);
    expect(onActive).toHaveBeenCalledTimes(1);

    // Activity restarted the timer.
    act(() => vi.advanceTimersByTime(999));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
    expect(onIdle).toHaveBeenCalledTimes(2);
  });

  it('respects initialState', () => {
    const { result } = renderHook(() => useIdle(1000, { initialState: true }));
    expect(result.current).toBe(true);
  });

  it('stops listening on unmount', () => {
    const onIdle = vi.fn();
    const { unmount } = renderHook(() => useIdle(1000, { onIdle }));
    unmount();
    act(() => vi.advanceTimersByTime(2000));
    expect(onIdle).not.toHaveBeenCalled();
  });
});
