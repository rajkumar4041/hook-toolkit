import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  beforeEach(() => {
    document.title = 'original';
  });

  it('sets the document title', () => {
    renderHook(() => useDocumentTitle('New Title'));
    expect(document.title).toBe('New Title');
  });

  it('updates the title when it changes', () => {
    const { rerender } = renderHook(({ t }) => useDocumentTitle(t), {
      initialProps: { t: 'First' },
    });
    expect(document.title).toBe('First');
    rerender({ t: 'Second' });
    expect(document.title).toBe('Second');
  });

  it('does not restore by default on unmount', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Temp'));
    expect(document.title).toBe('Temp');
    unmount();
    expect(document.title).toBe('Temp');
  });

  it('restores the previous title on unmount when enabled', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Temp', { restoreOnUnmount: true }));
    expect(document.title).toBe('Temp');
    unmount();
    expect(document.title).toBe('original');
  });
});
