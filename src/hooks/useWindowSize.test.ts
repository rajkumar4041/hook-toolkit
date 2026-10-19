import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWindowSize } from './useWindowSize';

function setWindowSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

describe('useWindowSize', () => {
  it('reads the current size after mount', () => {
    setWindowSize(1024, 768);
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).toEqual({ width: 1024, height: 768 });
  });

  it('updates on window resize', () => {
    setWindowSize(800, 600);
    const { result } = renderHook(() => useWindowSize());
    act(() => {
      setWindowSize(400, 300);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual({ width: 400, height: 300 });
  });
});
