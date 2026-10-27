import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer';

describe('useTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not tick until started', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.time).toBe(0);
    expect(result.current.isRunning).toBe(false);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.time).toBe(0);
  });

  it('counts up as a stopwatch', () => {
    const { result } = renderHook(() => useTimer({ autoStart: true }));
    expect(result.current.isRunning).toBe(true);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.time).toBe(3000);
  });

  it('pauses and resumes keeping the time', () => {
    const { result } = renderHook(() => useTimer({ autoStart: true }));
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.pause());
    expect(result.current.isRunning).toBe(false);
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.time).toBe(2000);
    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.time).toBe(3000);
  });

  it('counts down and fires onEnd at zero', () => {
    const onEnd = vi.fn();
    const { result } = renderHook(() =>
      useTimer({ initialTime: 3000, countdown: true, autoStart: true, onEnd }),
    );
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.time).toBe(1000);
    expect(onEnd).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.time).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('start resets to initialTime then runs', () => {
    const { result } = renderHook(() => useTimer({ initialTime: 5000, countdown: true }));
    act(() => result.current.start());
    expect(result.current.isRunning).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.time).toBe(4000);
  });

  it('restart stops and resets the time', () => {
    const { result } = renderHook(() => useTimer({ autoStart: true }));
    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current.restart());
    expect(result.current.time).toBe(0);
    expect(result.current.isRunning).toBe(false);
    act(() => result.current.restart(8000));
    expect(result.current.time).toBe(8000);
  });

  it('clears the interval on unmount', () => {
    const { result, unmount } = renderHook(() => useTimer({ autoStart: true }));
    act(() => vi.advanceTimersByTime(1000));
    unmount();
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.time).toBe(1000);
  });
});
