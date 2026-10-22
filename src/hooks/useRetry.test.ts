import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRetry } from './useRetry';

describe('useRetry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resolves on the first successful try', async () => {
    const fn = vi.fn(async () => 'ok');
    const { result } = renderHook(() => useRetry(fn));
    let outcome!: Awaited<ReturnType<typeof result.current.run>>;
    await act(async () => {
      outcome = await result.current.run();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ data: 'ok', error: null });
    expect(result.current.status).toBe('success');
    expect(result.current.attempt).toBe(1);
  });

  it('retries until it succeeds, applying backoff', async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new Error(`fail ${calls}`);
      return 'done';
    });
    const { result } = renderHook(() => useRetry(fn, { retries: 5, delay: 100, backoff: 2 }));

    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      const p = result.current.run().then((o) => (outcome = o));
      // attempt 1 fails -> wait 100ms; attempt 2 fails -> wait 200ms; attempt 3 ok
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await p;
    });
    expect(fn).toHaveBeenCalledTimes(3);
    expect(outcome).toEqual({ data: 'done', error: null });
    expect(result.current.data).toBe('done');
    expect(result.current.attempt).toBe(3);
  });

  it('gives up after the configured retries and reports the error', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn(async () => {
      throw new Error('always');
    });
    const { result } = renderHook(() => useRetry(fn, { retries: 2, delay: 50, onRetry }));
    let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      const p = result.current.run().then((o) => (outcome = o));
      await vi.advanceTimersByTimeAsync(50); // after 1st fail
      await vi.advanceTimersByTimeAsync(100); // after 2nd fail (50*2)
      await p;
    });
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(outcome?.error?.message).toBe('always');
    expect(result.current.status).toBe('error');
  });

  it('respects shouldRetry returning false', async () => {
    const fn = vi.fn(async () => {
      throw new Error('fatal');
    });
    const { result } = renderHook(() =>
      useRetry(fn, { retries: 5, delay: 50, shouldRetry: () => false }),
    );
    await act(async () => {
      await result.current.run();
    });
    expect(fn).toHaveBeenCalledTimes(1); // no retries
    expect(result.current.status).toBe('error');
  });

  it('cancel aborts a pending backoff wait', async () => {
    const fn = vi.fn(async () => {
      throw new Error('fail');
    });
    const { result } = renderHook(() => useRetry(fn, { retries: 5, delay: 1000 }));
    await act(async () => {
      void result.current.run();
      await Promise.resolve(); // let first attempt fail and enter backoff
    });
    expect(fn).toHaveBeenCalledTimes(1);
    act(() => result.current.cancel());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fn).toHaveBeenCalledTimes(1); // never retried after cancel
  });
});
