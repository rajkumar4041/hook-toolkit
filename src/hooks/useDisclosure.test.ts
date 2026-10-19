import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDisclosure } from './useDisclosure';

describe('useDisclosure', () => {
  it('starts closed with no data by default', () => {
    const { result } = renderHook(() => useDisclosure());
    expect(result.current.opened).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('respects the initial open state', () => {
    const { result } = renderHook(() => useDisclosure(true));
    expect(result.current.opened).toBe(true);
  });

  it('open() opens and attaches the typed data payload', () => {
    const { result } = renderHook(() => useDisclosure<{ id: number }>());
    act(() => result.current.open({ id: 7 }));
    expect(result.current.opened).toBe(true);
    expect(result.current.data).toEqual({ id: 7 });
  });

  it('close() closes and clears the data', () => {
    const { result } = renderHook(() => useDisclosure<string>());
    act(() => result.current.open('x'));
    act(() => result.current.close());
    expect(result.current.opened).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('toggle() flips state and can attach data when opening', () => {
    const { result } = renderHook(() => useDisclosure<string>());
    act(() => result.current.toggle('payload'));
    expect(result.current.opened).toBe(true);
    expect(result.current.data).toBe('payload');
    act(() => result.current.toggle());
    expect(result.current.opened).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('calls onOpen and onClose at the right times', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useDisclosure(false, { onOpen, onClose }));
    act(() => result.current.open());
    expect(onOpen).toHaveBeenCalledTimes(1);
    act(() => result.current.close());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps control identities stable across rerenders', () => {
    const { result, rerender } = renderHook(() => useDisclosure());
    const { open, close, toggle } = result.current;
    rerender();
    expect(result.current.open).toBe(open);
    expect(result.current.close).toBe(close);
    expect(result.current.toggle).toBe(toggle);
  });
});
