import { describe, it, expect, vi } from 'vitest';
import { renderHook, render, act } from '@testing-library/react';
import { useRef } from 'react';
import { useEventListener } from './useEventListener';

describe('useEventListener', () => {
  it('listens on window by default', () => {
    const handler = vi.fn();
    renderHook(() => useEventListener('resize', handler));
    act(() => window.dispatchEvent(new Event('resize')));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useEventListener('resize', handler));
    unmount();
    act(() => window.dispatchEvent(new Event('resize')));
    expect(handler).not.toHaveBeenCalled();
  });

  it('always calls the latest handler', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ h }) => useEventListener('resize', h), {
      initialProps: { h: first },
    });
    rerender({ h: second });
    act(() => window.dispatchEvent(new Event('resize')));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('attaches to an element via ref', () => {
    const handler = vi.fn();
    function Comp() {
      const ref = useRef<HTMLButtonElement>(null);
      useEventListener('click', handler, ref);
      return <button ref={ref}>click</button>;
    }
    const { getByText } = render(<Comp />);
    act(() => getByText('click').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('attaches to document when passed', () => {
    const handler = vi.fn();
    renderHook(() => useEventListener('visibilitychange', handler, document));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
