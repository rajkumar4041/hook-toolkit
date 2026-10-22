import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useInfiniteScroll } from './useInfiniteScroll';

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  cb: IOCallback;
  constructor(cb: IOCallback) {
    this.cb = cb;
    MockIntersectionObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  trigger(isIntersecting: boolean) {
    this.cb([{ isIntersecting }]);
  }
}

function Harness({ onLoadMore, enabled }: { onLoadMore: () => void; enabled?: boolean }) {
  const { ref } = useInfiniteScroll<HTMLDivElement>(onLoadMore, { enabled });
  return <div ref={ref} data-testid="sentinel" />;
}

const last = () =>
  MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1]!;

describe('useInfiniteScroll', () => {
  let original: typeof IntersectionObserver | undefined;
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    original = globalThis.IntersectionObserver;
    (globalThis as { IntersectionObserver: unknown }).IntersectionObserver =
      MockIntersectionObserver;
  });
  afterEach(() => {
    (globalThis as { IntersectionObserver: unknown }).IntersectionObserver = original;
  });

  it('calls onLoadMore when the sentinel enters view', () => {
    const onLoadMore = vi.fn();
    render(<Harness onLoadMore={onLoadMore} />);
    act(() => last().trigger(true));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('fires once per entry, not continuously while visible', () => {
    const onLoadMore = vi.fn();
    render(<Harness onLoadMore={onLoadMore} />);
    act(() => last().trigger(true));
    act(() => last().trigger(true)); // still visible, no transition
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    act(() => last().trigger(false)); // leaves
    act(() => last().trigger(true)); // re-enters -> fires again
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('does not observe when disabled', () => {
    const onLoadMore = vi.fn();
    render(<Harness onLoadMore={onLoadMore} enabled={false} />);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('disconnects on unmount', () => {
    const onLoadMore = vi.fn();
    const { unmount } = render(<Harness onLoadMore={onLoadMore} />);
    const observer = last();
    const spy = vi.spyOn(observer, 'disconnect');
    unmount();
    expect(spy).toHaveBeenCalled();
  });
});
