import { useCallback, useMemo, useState } from 'react';

export interface UseToggleControls {
  /** Flip the current value. */
  toggle: () => void;
  /** Set the value to `true`. */
  setOn: () => void;
  /** Set the value to `false`. */
  setOff: () => void;
  /** Set the value explicitly. */
  set: (value: boolean) => void;
}

/**
 * Manages a boolean with ergonomic controls, removing the repetitive
 * `setOpen((o) => !o)` boilerplate.
 *
 * @example
 * ```tsx
 * const [isOpen, { toggle, setOff }] = useToggle(false);
 * <button onClick={toggle}>Toggle</button>
 * <Modal open={isOpen} onClose={setOff} />
 * ```
 *
 * @param initial Initial boolean value. Defaults to `false`.
 * @returns A tuple of `[value, controls]`. The controls object is stable.
 */
export function useToggle(initial = false): [boolean, UseToggleControls] {
  const [value, setValue] = useState(initial);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const setOn = useCallback(() => setValue(true), []);
  const setOff = useCallback(() => setValue(false), []);
  const set = useCallback((next: boolean) => setValue(next), []);

  const controls = useMemo(() => ({ toggle, setOn, setOff, set }), [toggle, setOn, setOff, set]);

  return [value, controls];
}
