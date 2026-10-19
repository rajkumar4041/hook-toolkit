import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimeout } from './useTimeout';

describe('useTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires once after the delay', () => {
    const cb = vi.fn();
    renderHook(() => useTimeout(cb, 200));
    act(() => vi.advanceTimersByTime(199));
    expect(cb).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does nothing when delay is null', () => {
    const cb = vi.fn();
    renderHook(() => useTimeout(cb, null));
    act(() => vi.advanceTimersByTime(1000));
    expect(cb).not.toHaveBeenCalled();
  });

  it('restarts the timer when the delay value changes', () => {
    const cb = vi.fn();
    const { rerender } = renderHook(({ d }) => useTimeout(cb, d), {
      initialProps: { d: 200 as number | null },
    });
    act(() => vi.advanceTimersByTime(100)); // 100/200 of the original timer
    rerender({ d: 300 }); // delay changed -> effect re-runs, timer restarts at 0/300
    act(() => vi.advanceTimersByTime(299));
    expect(cb).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('does NOT restart when only the callback changes', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useTimeout(cb, 200), {
      initialProps: { cb: first },
    });
    act(() => vi.advanceTimersByTime(100));
    rerender({ cb: second }); // same delay -> timer keeps running
    act(() => vi.advanceTimersByTime(100)); // reaches 200 total
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1); // latest callback fires
  });

  it('cancels on unmount', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useTimeout(cb, 200));
    unmount();
    act(() => vi.advanceTimersByTime(500));
    expect(cb).not.toHaveBeenCalled();
  });
});
