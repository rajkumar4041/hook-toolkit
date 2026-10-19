import { useCallback, useEffect } from 'react';
import { useLatest } from './useLatest';
import { isBrowser } from '../utils/isBrowser';

export interface UseUnsavedChangesOptions {
  /** Turn the guard off without changing call sites. Defaults to `true`. */
  enabled?: boolean;
  /**
   * Confirmation text. Note: modern browsers IGNORE custom text for the native
   * `beforeunload` dialog and show their own generic message. The string is
   * still used by `confirmNavigation` for in-app (router) prompts.
   */
  message?: string;
}

export interface UseUnsavedChangesResult {
  /**
   * For client-side router guards: returns `true` if it is safe to navigate
   * (not dirty), otherwise shows a `window.confirm` dialog and returns its
   * result. `beforeunload` does not fire on SPA route changes, so call this
   * from your router's navigation-blocking API.
   */
  confirmNavigation: () => boolean;
}

const DEFAULT_MESSAGE = 'You have unsaved changes. Are you sure you want to leave?';

/**
 * Warns the user before they leave the page (reload, tab close, back button,
 * external navigation) while there are unsaved changes.
 *
 * @example
 * ```tsx
 * const { confirmNavigation } = useUnsavedChanges(form.isDirty);
 *
 * // Full-page unload is guarded automatically.
 * // For SPA route changes, gate your navigation on confirmNavigation():
 * if (confirmNavigation()) router.push('/next');
 * ```
 *
 * ### Limitations
 * - The native `beforeunload` prompt shows a **browser-controlled** message;
 *   custom text is ignored by Chrome, Firefox, and Safari.
 * - `beforeunload` does **not** fire for SPA client-side navigation. Use
 *   `confirmNavigation` with your router (e.g. React Router's `useBlocker`).
 * - SSR-safe: no listener is attached without a DOM.
 *
 * @param when    Whether there are unsaved changes to guard.
 * @param options `enabled`, `message`.
 */
export function useUnsavedChanges(
  when: boolean,
  options: UseUnsavedChangesOptions = {},
): UseUnsavedChangesResult {
  const { enabled = true, message = DEFAULT_MESSAGE } = options;
  const active = enabled && when;
  const activeRef = useLatest(active);
  const messageRef = useLatest(message);

  useEffect(() => {
    if (!isBrowser || !active) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required by the HTML spec to trigger the prompt in some browsers.
      event.returnValue = messageRef.current;
      return messageRef.current;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active, messageRef]);

  const confirmNavigation = useCallback((): boolean => {
    if (!activeRef.current) return true;
    if (!isBrowser) return true;
    return window.confirm(messageRef.current);
  }, [activeRef, messageRef]);

  return { confirmNavigation };
}
