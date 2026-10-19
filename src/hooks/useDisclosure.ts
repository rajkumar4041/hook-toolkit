import { useCallback, useMemo, useRef, useState } from 'react';
import { useLatest } from './useLatest';

export interface UseDisclosureOptions {
  /** Called whenever the disclosure transitions to open. */
  onOpen?: () => void;
  /** Called whenever the disclosure transitions to closed. */
  onClose?: () => void;
}

export interface UseDisclosure<T> {
  /** Whether the disclosure (modal/drawer/popover) is open. */
  opened: boolean;
  /** Optional payload passed to `open`/`toggle` — e.g. the item being edited. */
  data: T | undefined;
  /** Open, optionally attaching a data payload. */
  open: (data?: T) => void;
  /** Close and clear the data payload. */
  close: () => void;
  /** Toggle open/closed; when opening, optionally attach a data payload. */
  toggle: (data?: T) => void;
}

/**
 * Manages open/closed state for a modal, drawer, dialog, or popover, with an
 * optional typed data payload (the record you're opening it for).
 *
 * Replaces the repetitive `useState` + "which item is this modal for?" pattern
 * with one typed object of stable controls.
 *
 * @example
 * ```tsx
 * const dialog = useDisclosure<User>();
 * <button onClick={() => dialog.open(user)}>Edit</button>
 * <Modal open={dialog.opened} onClose={dialog.close}>
 *   {dialog.data && <EditForm user={dialog.data} />}
 * </Modal>
 * ```
 *
 * Unlike a deep-cloning implementation, the `data` payload is stored by
 * reference (no `lodash`/`structuredClone`); clone before passing if you need
 * isolation from later external mutation. All controls are referentially stable.
 *
 * @param initialOpen Initial open state. Defaults to `false`.
 * @param options     `onOpen` / `onClose` lifecycle callbacks.
 */
export function useDisclosure<T = unknown>(
  initialOpen = false,
  options: UseDisclosureOptions = {},
): UseDisclosure<T> {
  const [opened, setOpened] = useState<boolean>(initialOpen);
  const [data, setData] = useState<T | undefined>(undefined);

  const onOpenRef = useLatest(options.onOpen);
  const onCloseRef = useLatest(options.onClose);

  // Live ref so `toggle` reads the current state without being recreated.
  const openedRef = useRef(opened);
  openedRef.current = opened;

  const open = useCallback(
    (payload?: T) => {
      setData(payload);
      setOpened(true);
      onOpenRef.current?.();
    },
    [onOpenRef],
  );

  const close = useCallback(() => {
    setOpened(false);
    setData(undefined);
    onCloseRef.current?.();
  }, [onCloseRef]);

  const toggle = useCallback(
    (payload?: T) => {
      if (openedRef.current) close();
      else open(payload);
    },
    [open, close],
  );

  return useMemo(
    () => ({ opened, data, open, close, toggle }),
    [opened, data, open, close, toggle],
  );
}
