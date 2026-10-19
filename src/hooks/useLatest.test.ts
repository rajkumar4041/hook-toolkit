import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLatest } from './useLatest';

describe('useLatest', () => {
  it('returns a ref holding the initial value', () => {
    const { result } = renderHook(() => useLatest(1));
    expect(result.current.current).toBe(1);
  });

  it('updates to the latest value on rerender', () => {
    const { result, rerender } = renderHook(({ v }) => useLatest(v), {
      initialProps: { v: 1 },
    });
    expect(result.current.current).toBe(1);
    rerender({ v: 2 });
    expect(result.current.current).toBe(2);
  });

  it('keeps a stable ref identity across rerenders', () => {
    const { result, rerender } = renderHook(({ v }) => useLatest(v), {
      initialProps: { v: 1 },
    });
    const first = result.current;
    rerender({ v: 2 });
    expect(result.current).toBe(first);
  });

  it('works with function values', () => {
    const fnA = () => 'a';
    const fnB = () => 'b';
    const { result, rerender } = renderHook(({ fn }) => useLatest(fn), {
      initialProps: { fn: fnA },
    });
    expect(result.current.current).toBe(fnA);
    rerender({ fn: fnB });
    expect(result.current.current).toBe(fnB);
  });
});
