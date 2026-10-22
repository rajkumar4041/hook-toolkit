import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePolling } from './usePolling';

describe('usePolling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('polls immediately then on each interval', async () => {
    const fn = vi.fn(async () => 'tick');
    const { result } = renderHook(() => usePolling(fn, { interval: 1000 }));
    // immediate run
    await act(async () => {
      await Promise.resolve();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe('tick');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fn).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not run when disabled', async () => {
    const fn = vi.fn(async () => 'x');
    renderHook(() => usePolling(fn, { interval: 500, enabled: false }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('skips the immediate run when immediate is false', async () => {
    const fn = vi.fn(async () => 'x');
    renderHook(() => usePolling(fn, { interval: 500, immediate: false }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(fn).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('stop() halts polling', async () => {
    const fn = vi.fn(async () => 'x');
    const { result } = renderHook(() => usePolling(fn, { interval: 500 }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    act(() => result.current.stop());
    expect(result.current.isPolling).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('captures errors and calls onError', async () => {
    const onError = vi.fn();
    const fn = vi.fn(async () => {
      throw new Error('poll failed');
    });
    const { result } = renderHook(() => usePolling(fn, { interval: 500, onError }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.error?.message).toBe('poll failed');
    expect(onError).toHaveBeenCalledOnce();
  });

  it('stops polling on unmount', async () => {
    const fn = vi.fn(async () => 'x');
    const { unmount } = renderHook(() => usePolling(fn, { interval: 500 }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
