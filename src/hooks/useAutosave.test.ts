import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutosave } from './useAutosave';

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not save on mount', () => {
    const onSave = vi.fn(async () => {});
    renderHook(() => useAutosave({ text: 'hi' }, onSave, { delay: 500 }));
    act(() => vi.advanceTimersByTime(1000));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('is dirty when data changes and saves after the delay', async () => {
    const onSave = vi.fn(async () => {});
    const { result, rerender } = renderHook(
      ({ data }) => useAutosave(data, onSave, { delay: 500 }),
      { initialProps: { data: { text: 'a' } } },
    );
    rerender({ data: { text: 'b' } });
    expect(result.current.isDirty).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
    expect(result.current.isDirty).toBe(false);
  });

  it('debounces rapid changes into a single save', async () => {
    const onSave = vi.fn(async () => {});
    const { rerender } = renderHook(
      ({ data }) => useAutosave(data, onSave, { delay: 500 }),
      { initialProps: { data: { text: 'a' } } },
    );
    rerender({ data: { text: 'ab' } });
    act(() => vi.advanceTimersByTime(300));
    rerender({ data: { text: 'abc' } });
    act(() => vi.advanceTimersByTime(300));
    expect(onSave).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('reports error status and calls onError on failure', async () => {
    const onError = vi.fn();
    const onSave = vi.fn(async () => {
      throw new Error('save failed');
    });
    const { result, rerender } = renderHook(
      ({ data }) => useAutosave(data, onSave, { delay: 100, onError }),
      { initialProps: { data: 1 } },
    );
    rerender({ data: 2 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error?.message).toBe('save failed');
    expect(onError).toHaveBeenCalledOnce();
    expect(result.current.isDirty).toBe(true); // remains dirty after a failed save
  });

  it('saveNow() flushes immediately, bypassing the debounce', async () => {
    const onSave = vi.fn(async () => {});
    const { result, rerender } = renderHook(
      ({ data }) => useAutosave(data, onSave, { delay: 5000 }),
      { initialProps: { data: 'a' } },
    );
    rerender({ data: 'b' });
    await act(async () => {
      await result.current.saveNow();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
  });

  it('does not autosave when disabled', () => {
    const onSave = vi.fn(async () => {});
    const { rerender } = renderHook(
      ({ data }) => useAutosave(data, onSave, { delay: 100, enabled: false }),
      { initialProps: { data: 'a' } },
    );
    rerender({ data: 'b' });
    act(() => vi.advanceTimersByTime(1000));
    expect(onSave).not.toHaveBeenCalled();
  });
});
