import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsyncAction } from './useAsyncAction';

/** A promise plus its resolve/reject handles, for driving async timing. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAsyncAction', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useAsyncAction(async () => 1));
    expect(result.current.status).toBe('idle');
    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('transitions idle -> loading -> success', async () => {
    const d = deferred<number>();
    const { result } = renderHook(() => useAsyncAction(() => d.promise));
    let runPromise!: Promise<unknown>;
    act(() => {
      runPromise = result.current.run();
    });
    expect(result.current.status).toBe('loading');
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      d.resolve(42);
      await runPromise;
    });
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe(42);
  });

  it('transitions to error and never rejects run()', async () => {
    const d = deferred<number>();
    const { result } = renderHook(() => useAsyncAction(() => d.promise));
    let runResult!: Awaited<ReturnType<typeof result.current.run>>;
    await act(async () => {
      const p = result.current.run();
      d.reject(new Error('boom'));
      runResult = await p;
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toBe('boom');
    expect(runResult).toEqual({ data: null, error: new Error('boom') });
  });

  it('guards against duplicate submissions (returns the in-flight promise)', async () => {
    const fn = vi.fn(() => deferred<number>().promise);
    const { result } = renderHook(() => useAsyncAction(fn));
    act(() => {
      result.current.run();
      result.current.run();
      result.current.run();
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes an AbortSignal and aborts on a superseding concurrent run', async () => {
    const signals: AbortSignal[] = [];
    const makeFn = () => (signal: AbortSignal) => {
      signals.push(signal);
      return deferred<number>().promise;
    };
    const { result } = renderHook(() => useAsyncAction(makeFn(), { allowConcurrent: true }));
    act(() => void result.current.run());
    act(() => void result.current.run());
    expect(signals).toHaveLength(2);
    expect(signals[0]!.aborted).toBe(true);
    expect(signals[1]!.aborted).toBe(false);
  });

  it('ignores a stale result from a superseded run', async () => {
    const d1 = deferred<string>();
    const d2 = deferred<string>();
    const calls = [d1, d2];
    let i = 0;
    const { result } = renderHook(() =>
      useAsyncAction(() => calls[i++]!.promise, { allowConcurrent: true }),
    );
    act(() => void result.current.run());
    act(() => void result.current.run());
    await act(async () => {
      d2.resolve('second');
      d1.resolve('first'); // resolves last but is stale
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.data).toBe('second'));
    expect(result.current.data).toBe('second');
  });

  it('reset() returns to idle', async () => {
    const { result } = renderHook(() => useAsyncAction(async () => 7));
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.status).toBe('success');
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
  });

  it('does not update state after unmount', async () => {
    const d = deferred<number>();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useAsyncAction(() => d.promise));
    act(() => void result.current.run());
    unmount();
    await act(async () => {
      d.resolve(1);
      await Promise.resolve();
    });
    // No "state update on unmounted component" warning should be produced.
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
