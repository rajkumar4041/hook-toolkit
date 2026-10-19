import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnsavedChanges } from './useUnsavedChanges';

/** Dispatch a cancelable beforeunload event and report whether it was prevented. */
function fireBeforeUnload(): boolean {
  const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('useUnsavedChanges', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not block unload when there are no changes', () => {
    renderHook(() => useUnsavedChanges(false));
    expect(fireBeforeUnload()).toBe(false);
  });

  it('blocks unload when there are unsaved changes', () => {
    renderHook(() => useUnsavedChanges(true));
    expect(fireBeforeUnload()).toBe(true);
  });

  it('stops blocking once changes are saved', () => {
    const { rerender } = renderHook(({ dirty }) => useUnsavedChanges(dirty), {
      initialProps: { dirty: true },
    });
    expect(fireBeforeUnload()).toBe(true);
    rerender({ dirty: false });
    expect(fireBeforeUnload()).toBe(false);
  });

  it('respects the enabled option', () => {
    renderHook(() => useUnsavedChanges(true, { enabled: false }));
    expect(fireBeforeUnload()).toBe(false);
  });

  it('removes the listener on unmount', () => {
    const { unmount } = renderHook(() => useUnsavedChanges(true));
    unmount();
    expect(fireBeforeUnload()).toBe(false);
  });

  it('confirmNavigation returns true when not dirty without prompting', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = renderHook(() => useUnsavedChanges(false));
    expect(result.current.confirmNavigation()).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('confirmNavigation prompts and returns the result when dirty', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderHook(() => useUnsavedChanges(true));
    let ok!: boolean;
    act(() => {
      ok = result.current.confirmNavigation();
    });
    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(ok).toBe(true);
  });
});
