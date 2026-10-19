import { useCallback, useRef, useState } from 'react';
import { isBrowser } from '../utils/isBrowser';

export interface UseClipboardOptions {
  /** How long (ms) `copied` stays `true` after a successful copy. Defaults to 2000. */
  resetDelay?: number;
}

export interface UseClipboardResult {
  /** Copy text to the clipboard. Resolves `true` on success, `false` on failure. */
  copy: (text: string) => Promise<boolean>;
  /** `true` briefly after a successful copy (for "Copied!" feedback). */
  copied: boolean;
  /** The error from the last failed copy, or `null`. */
  error: Error | null;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Copies text to the clipboard with built-in success feedback and error state.
 *
 * @example
 * ```tsx
 * const { copy, copied } = useClipboard();
 * <button onClick={() => copy(shareUrl)}>{copied ? 'Copied!' : 'Copy link'}</button>
 * ```
 *
 * Uses the async Clipboard API (`navigator.clipboard.writeText`), which
 * requires a secure context (HTTPS or localhost) and, in some browsers, a user
 * gesture. On failure `copy` resolves `false` and sets `error` — it never
 * throws. SSR-safe.
 *
 * @param options `resetDelay` for how long `copied` stays true.
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardResult {
  const { resetDelay = 2000 } = options;
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (timerRef.current) clearTimeout(timerRef.current);
      try {
        if (!isBrowser || !navigator.clipboard?.writeText) {
          throw new Error('Clipboard API is unavailable in this environment');
        }
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setError(null);
        timerRef.current = setTimeout(() => setCopied(false), resetDelay);
        return true;
      } catch (err) {
        setCopied(false);
        setError(toError(err));
        return false;
      }
    },
    [resetDelay],
  );

  return { copy, copied, error };
}
