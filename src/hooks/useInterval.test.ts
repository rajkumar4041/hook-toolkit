import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInterval } from './useInterval';

describe('useInterval', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls the callback on each interval', () => {
    const cb = vi.fn();
    renderHook(() => useInterval(cb, 100));
    expect(cb).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(350));
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('pauses when delay is null', () => {
    const cb = vi.fn();
    renderHook(() => useInterval(cb, null));
    act(() => vi.advanceTimersByTime(1000));
    expect(cb).not.toHaveBeenCalled();
  });

  it('always calls the latest callback without resetting the timer', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useInterval(cb, 100), {
      initialProps: { cb: first },
    });
    act(() => vi.advanceTimersByTime(100));
    expect(first).toHaveBeenCalledTimes(1);
    rerender({ cb: second });
    act(() => vi.advanceTimersByTime(100));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clears the interval on unmount', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useInterval(cb, 100));
    unmount();
    act(() => vi.advanceTimersByTime(500));
    expect(cb).not.toHaveBeenCalled();
  });
});
