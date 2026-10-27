import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHotkey } from './useHotkey';

function press(init: KeyboardEventInit) {
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', init)));
}

describe('useHotkey', () => {
  it('fires on a single key', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('a', handler));
    press({ key: 'a' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores unmatched keys', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('a', handler));
    press({ key: 'b' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('matches a modifier combo and ignores the key alone', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('ctrl+s', handler));
    press({ key: 's' });
    expect(handler).not.toHaveBeenCalled();
    press({ key: 's', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not fire when extra modifiers are held', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('ctrl+s', handler));
    press({ key: 's', ctrlKey: true, shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('treats modifier aliases as equivalent', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('cmd+k', handler));
    press({ key: 'k', metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('binds multiple combos to one handler', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey(['meta+k', 'ctrl+k'], handler));
    press({ key: 'k', metaKey: true });
    press({ key: 'k', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('matches by event code (e.g. "keya")', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('keya', handler));
    press({ key: 'a', code: 'KeyA' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls preventDefault by default and can be disabled', () => {
    renderHook(() => useHotkey('a', () => {}));
    const prevented = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    act(() => window.dispatchEvent(prevented));
    expect(prevented.defaultPrevented).toBe(true);

    renderHook(() => useHotkey('b', () => {}, { preventDefault: false }));
    const notPrevented = new KeyboardEvent('keydown', { key: 'b', cancelable: true });
    act(() => window.dispatchEvent(notPrevented));
    expect(notPrevented.defaultPrevented).toBe(false);
  });

  it('does nothing when disabled', () => {
    const handler = vi.fn();
    renderHook(() => useHotkey('a', handler, { enabled: false }));
    press({ key: 'a' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('removes the listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkey('a', handler));
    unmount();
    press({ key: 'a' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('always calls the latest handler', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ h }) => useHotkey('a', h), {
      initialProps: { h: first },
    });
    rerender({ h: second });
    press({ key: 'a' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
