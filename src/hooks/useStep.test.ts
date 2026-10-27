import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStep } from './useStep';

describe('useStep', () => {
  it('starts at step 1 by default', () => {
    const { result } = renderHook(() => useStep(3));
    expect(result.current[0]).toBe(1);
    expect(result.current[1].isFirst).toBe(true);
    expect(result.current[1].canBack).toBe(false);
  });

  it('advances and goes back, clamping at the bounds', () => {
    const { result } = renderHook(() => useStep(3));
    act(() => result.current[1].next());
    expect(result.current[0]).toBe(2);
    act(() => result.current[1].next());
    expect(result.current[0]).toBe(3);
    expect(result.current[1].isLast).toBe(true);
    act(() => result.current[1].next()); // clamped
    expect(result.current[0]).toBe(3);
    act(() => result.current[1].back());
    expect(result.current[0]).toBe(2);
  });

  it('honours the initial option, clamped into range', () => {
    const { result } = renderHook(() => useStep(3, { initial: 2 }));
    expect(result.current[0]).toBe(2);
    const { result: tooHigh } = renderHook(() => useStep(3, { initial: 99 }));
    expect(tooHigh.current[0]).toBe(3);
  });

  it('setStep jumps and clamps', () => {
    const { result } = renderHook(() => useStep(5));
    act(() => result.current[1].setStep(4));
    expect(result.current[0]).toBe(4);
    act(() => result.current[1].setStep(0));
    expect(result.current[0]).toBe(1);
  });

  it('reset returns to the initial step', () => {
    const { result } = renderHook(() => useStep(3, { initial: 2 }));
    act(() => result.current[1].next());
    expect(result.current[0]).toBe(3);
    act(() => result.current[1].reset());
    expect(result.current[0]).toBe(2);
  });

  it('wraps with loop enabled', () => {
    const { result } = renderHook(() => useStep(3, { initial: 3, loop: true }));
    expect(result.current[1].canNext).toBe(true);
    act(() => result.current[1].next());
    expect(result.current[0]).toBe(1);
    act(() => result.current[1].back());
    expect(result.current[0]).toBe(3);
  });
});
