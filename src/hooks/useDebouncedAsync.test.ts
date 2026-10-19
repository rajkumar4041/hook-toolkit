import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedAsync } from './useDebouncedAsync';

describe('useDebouncedAsync', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fetches the initial value immediately and debounces later changes', () => {
    // Never resolves: this test only asserts call timing, not results.
    const fetcher = vi.fn((_q: string, _s: AbortSignal) => new Promise<string>(() => {}));
    const { rerender } = renderHook(({ q }) => useDebouncedAsync(q, fetcher, { delay: 300 }), {
      initialProps: { q: 'a' },
    });
    // The already-settled initial value is fetched right away.
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenLastCalledWith('a', expect.any(AbortSignal));
    // A change is debounced: no new fetch until the delay elapses.
    rerender({ q: 'ab' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(300));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith('ab', expect.any(AbortSignal));
  });

  it('exposes isDebouncing while a change is pending', () => {
    const fetcher = vi.fn((_q: string, _s: AbortSignal) => new Promise<string>(() => {}));
    const { result, rerender } = renderHook(
      ({ q }) => useDebouncedAsync(q, fetcher, { delay: 300 }),
      { initialProps: { q: 'a' } },
    );
    rerender({ q: 'ab' });
    expect(result.current.isDebouncing).toBe(true);
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.isDebouncing).toBe(false);
  });

  it('skips fetching when enabled() returns false', () => {
    const fetcher = vi.fn(async () => 'r');
    renderHook(() =>
      useDebouncedAsync('', fetcher, { delay: 100, enabled: (q) => q.length > 0 }),
    );
    act(() => vi.advanceTimersByTime(100));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('sets data on success', async () => {
    const fetcher = vi.fn(async () => 'hello');
    const { result } = renderHook(() => useDebouncedAsync('x', fetcher, { delay: 100 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(result.current.data).toBe('hello');
    expect(result.current.isLoading).toBe(false);
  });

  it('aborts the previous request when the value changes again', async () => {
    const seen: AbortSignal[] = [];
    const fetcher = vi.fn((_q: string, signal: AbortSignal) => {
      seen.push(signal);
      return new Promise<string>(() => {}); // never resolves
    });
    const { rerender } = renderHook(({ q }) => useDebouncedAsync(q, fetcher, { delay: 100 }), {
      initialProps: { q: 'a' },
    });
    act(() => vi.advanceTimersByTime(100));
    rerender({ q: 'ab' });
    act(() => vi.advanceTimersByTime(100));
    expect(seen).toHaveLength(2);
    expect(seen[0]!.aborted).toBe(true);
    expect(seen[1]!.aborted).toBe(false);
  });

  it('protects against stale results overwriting newer ones', async () => {
    let resolveFirst!: (v: string) => void;
    const responses: Array<Promise<string>> = [
      new Promise<string>((res) => {
        resolveFirst = res;
      }),
      Promise.resolve('second'),
    ];
    let i = 0;
    const fetcher = (_q: string, _s: AbortSignal) => responses[i++]!;
    const { result, rerender } = renderHook(
      ({ q }) => useDebouncedAsync(q, fetcher, { delay: 100 }),
      { initialProps: { q: 'a' } },
    );
    // Mount fired fetch #0 (pending). Change to 'ab' and let it fire fetch #1.
    rerender({ q: 'ab' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100); // fetch #1 fires and resolves 'second'
      resolveFirst('first'); // stale fetch #0 resolves afterwards
      await Promise.resolve();
    });
    expect(result.current.data).toBe('second');
  });
});
