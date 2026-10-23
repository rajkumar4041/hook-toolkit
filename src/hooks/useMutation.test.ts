import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMutation } from './useMutation';

describe('useMutation', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useMutation(async () => 1));
    expect(result.current.status).toBe('idle');
    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('mutateAsync resolves with data and sets success state', async () => {
    const fn = vi.fn(async (n: number) => n * 2);
    const { result } = renderHook(() => useMutation(fn));
    let returned!: number;
    await act(async () => {
      returned = await result.current.mutateAsync(21);
    });
    expect(returned).toBe(42);
    expect(fn).toHaveBeenCalledWith(21);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toBe(42);
  });

  it('mutateAsync rejects on error and sets error state', async () => {
    const { result } = renderHook(() =>
      useMutation(async () => {
        throw new Error('nope');
      }),
    );
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('nope');
    });
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('nope');
  });

  it('mutate is fire-and-forget and never throws', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useMutation<void, void>(
        async () => {
          throw new Error('fail');
        },
        { onError },
      ),
    );
    act(() => {
      result.current.mutate(); // must not throw synchronously
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(onError).toHaveBeenCalledOnce();
  });

  it('calls lifecycle callbacks in order', async () => {
    const calls: string[] = [];
    const { result } = renderHook(() =>
      useMutation(async (v: string) => `ok:${v}`, {
        onMutate: () => calls.push('mutate'),
        onSuccess: (data) => calls.push(`success:${data}`),
        onSettled: () => calls.push('settled'),
      }),
    );
    await act(async () => {
      await result.current.mutateAsync('x');
    });
    expect(calls).toEqual(['mutate', 'success:ok:x', 'settled']);
  });

  it('reset returns to idle', async () => {
    const { result } = renderHook(() => useMutation(async () => 'v'));
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(result.current.isSuccess).toBe(true);
    act(() => result.current.reset());
    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('does not throw a state-update warning after unmount', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let resolve!: (v: string) => void;
    const { result, unmount } = renderHook(() =>
      useMutation(() => new Promise<string>((r) => (resolve = r))),
    );
    let p!: Promise<string>;
    act(() => {
      p = result.current.mutateAsync();
    });
    unmount();
    await act(async () => {
      resolve('late');
      await p;
    });
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
