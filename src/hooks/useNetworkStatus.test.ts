import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from './useNetworkStatus';

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('useNetworkStatus', () => {
  afterEach(() => setOnLine(true));

  it('reflects the initial navigator.onLine value', () => {
    setOnLine(true);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.online).toBe(true);
  });

  it('updates to offline on the offline event', () => {
    setOnLine(true);
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.online).toBe(false);
  });

  it('updates back to online on the online event', () => {
    setOnLine(false);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.online).toBe(false);
    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.online).toBe(true);
  });
});
