import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFetch } from './useFetch';
import { useInvalidateQueries } from './useInvalidateQueries';
import { invalidateQueries, keyMatches } from './queryRegistry';

describe('keyMatches', () => {
  it('prefix-matches by default', () => {
    expect(keyMatches(['todos', 1], ['todos'], false)).toBe(true);
    expect(keyMatches(['todos'], ['todos'], false)).toBe(true);
    expect(keyMatches(['todos'], ['todos', 1], false)).toBe(false);
    expect(keyMatches(['users'], ['todos'], false)).toBe(false);
  });

  it('requires identical keys when exact', () => {
    expect(keyMatches(['todos', 1], ['todos'], true)).toBe(false);
    expect(keyMatches(['todos', 1], ['todos', 1], true)).toBe(true);
  });

  it('compares object segments structurally', () => {
    expect(keyMatches(['todos', { done: true }], ['todos', { done: true }], true)).toBe(true);
    expect(keyMatches(['todos', { done: true }], ['todos', { done: false }], true)).toBe(false);
  });
});

describe('invalidateQueries + useFetch', () => {
  it('refetches a mounted query whose key matches (prefix)', async () => {
    const queryFn = vi.fn(async () => 'v');
    renderHook(() => useFetch({ queryKey: ['todos', 1], queryFn }));
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

    await act(async () => {
      await invalidateQueries(['todos']);
    });
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('does not refetch a non-matching key', async () => {
    const queryFn = vi.fn(async () => 'v');
    renderHook(() => useFetch({ queryKey: ['users'], queryFn }));
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

    await act(async () => {
      await invalidateQueries(['todos']);
    });
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('exact: true only refetches the identical key', async () => {
    const queryFn = vi.fn(async () => 'v');
    renderHook(() => useFetch({ queryKey: ['todos', 1], queryFn }));
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

    await act(async () => {
      await invalidateQueries(['todos'], { exact: true });
    });
    expect(queryFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await invalidateQueries(['todos', 1], { exact: true });
    });
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('the useInvalidateQueries hook returns a stable invalidator', async () => {
    const queryFn = vi.fn(async () => 'v');
    renderHook(() => useFetch({ queryKey: ['todos'], queryFn }));
    const { result, rerender } = renderHook(() => useInvalidateQueries());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current(['todos']);
    });
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('unmounted queries are not refetched', async () => {
    const queryFn = vi.fn(async () => 'v');
    const { unmount } = renderHook(() => useFetch({ queryKey: ['todos'], queryFn }));
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    unmount();

    await act(async () => {
      await invalidateQueries(['todos']);
    });
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('disabled queries are not registered (not refetched)', async () => {
    const queryFn = vi.fn(async () => 'v');
    renderHook(() => useFetch({ queryKey: ['todos'], queryFn, enabled: false }));

    await act(async () => {
      await invalidateQueries(['todos']);
    });
    expect(queryFn).not.toHaveBeenCalled();
  });
});
