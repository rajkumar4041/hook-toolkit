import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFetch } from './useFetch';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useFetch', () => {
  it('fetches on mount and exposes data + loading flags', async () => {
    const d = deferred<string>();
    const { result } = renderHook(() => useFetch({ queryKey: ['x'], queryFn: () => d.promise }));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    await act(async () => {
      d.resolve('hello');
      await d.promise;
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe('hello');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error state on failure', async () => {
    const d = deferred<string>();
    const { result } = renderHook(() => useFetch({ queryKey: ['x'], queryFn: () => d.promise }));
    await act(async () => {
      d.reject(new Error('boom'));
      await d.promise.catch(() => {});
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('boom');
  });

  it('does not fetch when disabled, then fetches when enabled', async () => {
    const queryFn = vi.fn(async () => 'data');
    const { result, rerender } = renderHook(
      ({ enabled }) => useFetch({ queryKey: ['x'], queryFn, enabled }),
      { initialProps: { enabled: false } },
    );
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.isIdle).toBe(true);
    rerender({ enabled: true });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
  });

  it('refetches when the queryKey changes', async () => {
    const queryFn = vi.fn(async (): Promise<string> => 'r');
    const { rerender } = renderHook(({ id }) => useFetch({ queryKey: ['item', id], queryFn }), {
      initialProps: { id: 1 },
    });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    rerender({ id: 2 });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
  });

  it('keepPreviousData retains data across key changes', async () => {
    let n = 0;
    const queryFn = vi.fn(async () => `page-${++n}`);
    const { result, rerender } = renderHook(
      ({ page }) => useFetch({ queryKey: ['p', page], queryFn, keepPreviousData: true }),
      { initialProps: { page: 1 } },
    );
    await waitFor(() => expect(result.current.data).toBe('page-1'));
    rerender({ page: 2 });
    // While page 2 loads, previous data is still shown.
    expect(result.current.data).toBe('page-1');
    expect(result.current.isFetching).toBe(true);
    await waitFor(() => expect(result.current.data).toBe('page-2'));
  });

  it('refetch() re-runs the query', async () => {
    const queryFn = vi.fn(async () => 'v');
    const { result } = renderHook(() => useFetch({ queryKey: ['x'], queryFn }));
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.refetch();
    });
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale response when the key changed', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const responses = [first, second];
    let i = 0;
    const { result, rerender } = renderHook(
      ({ id }) => useFetch({ queryKey: ['x', id], queryFn: () => responses[i++]!.promise }),
      { initialProps: { id: 1 } },
    );
    rerender({ id: 2 });
    await act(async () => {
      second.resolve('second');
      first.resolve('first'); // stale, resolves last
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.data).toBe('second'));
    expect(result.current.data).toBe('second');
  });
});
