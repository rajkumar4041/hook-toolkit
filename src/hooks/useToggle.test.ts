import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToggle } from './useToggle';

describe('useToggle', () => {
  it('defaults to false', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current[0]).toBe(false);
  });

  it('respects the initial value', () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current[0]).toBe(true);
  });

  it('toggle flips the value', () => {
    const { result } = renderHook(() => useToggle(false));
    act(() => result.current[1].toggle());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1].toggle());
    expect(result.current[0]).toBe(false);
  });

  it('setOn / setOff / set work', () => {
    const { result } = renderHook(() => useToggle(false));
    act(() => result.current[1].setOn());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1].setOff());
    expect(result.current[0]).toBe(false);
    act(() => result.current[1].set(true));
    expect(result.current[0]).toBe(true);
  });

  it('keeps the controls object stable across rerenders', () => {
    const { result, rerender } = renderHook(() => useToggle());
    const controls = result.current[1];
    rerender();
    expect(result.current[1]).toBe(controls);
  });
});
