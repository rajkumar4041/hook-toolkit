import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';
import { useClickOutside } from './useClickOutside';

function Harness({ onOutside, enabled }: { onOutside: () => void; enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onOutside, enabled === undefined ? undefined : { enabled });
  return (
    <div>
      <div ref={ref} data-testid="inside">
        inside
        <button data-testid="child">child</button>
      </div>
      <div data-testid="outside">outside</div>
    </div>
  );
}

function mousedown(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });
}

describe('useClickOutside', () => {
  it('fires when clicking outside the element', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Harness onOutside={onOutside} />);
    mousedown(getByTestId('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('does not fire when clicking inside the element', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Harness onOutside={onOutside} />);
    mousedown(getByTestId('inside'));
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('does not fire when clicking a descendant', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Harness onOutside={onOutside} />);
    mousedown(getByTestId('child'));
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('respects enabled: false', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Harness onOutside={onOutside} enabled={false} />);
    mousedown(getByTestId('outside'));
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('stops firing after unmount', () => {
    const onOutside = vi.fn();
    const { getByTestId, unmount } = render(<Harness onOutside={onOutside} />);
    const outside = getByTestId('outside');
    unmount();
    mousedown(outside);
    expect(onOutside).not.toHaveBeenCalled();
  });
});
