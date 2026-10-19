import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('starts at the initial value', () => {
    const { result } = renderHook(() => useCounter(5));
    expect(result.current[0]).toBe(5);
  });

  it('increments and decrements by step', () => {
    const { result } = renderHook(() => useCounter(0, { step: 2 }));
    act(() => result.current[1].increment());
    expect(result.current[0]).toBe(2);
    act(() => result.current[1].decrement());
    expect(result.current[0]).toBe(0);
  });

  it('accepts an explicit amount', () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => result.current[1].increment(5));
    expect(result.current[0]).toBe(5);
    act(() => result.current[1].decrement(3));
    expect(result.current[0]).toBe(2);
  });

  it('clamps to min and max', () => {
    const { result } = renderHook(() => useCounter(0, { min: 0, max: 3 }));
    act(() => result.current[1].increment(10));
    expect(result.current[0]).toBe(3);
    act(() => result.current[1].decrement(10));
    expect(result.current[0]).toBe(0);
  });

  it('clamps the initial value into range', () => {
    const { result } = renderHook(() => useCounter(100, { max: 10 }));
    expect(result.current[0]).toBe(10);
  });

  it('set and reset work', () => {
    const { result } = renderHook(() => useCounter(5, { min: 0, max: 10 }));
    act(() => result.current[1].set(8));
    expect(result.current[0]).toBe(8);
    act(() => result.current[1].reset());
    expect(result.current[0]).toBe(5);
  });
});
