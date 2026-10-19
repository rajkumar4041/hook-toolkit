import { useCallback, useMemo, useState } from 'react';

export interface UseCounterOptions {
  /** Lower bound; the value never goes below this. */
  min?: number;
  /** Upper bound; the value never goes above this. */
  max?: number;
  /** Amount applied by `increment`/`decrement` when no argument is given. Defaults to 1. */
  step?: number;
}

export interface UseCounterControls {
  increment: (by?: number) => void;
  decrement: (by?: number) => void;
  set: (value: number) => void;
  reset: () => void;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Manages a numeric counter with optional clamping and a configurable step.
 *
 * @example
 * ```tsx
 * const [count, { increment, decrement, reset }] = useCounter(0, { min: 0, max: 10 });
 * ```
 *
 * @param initial Initial value (clamped into range if `min`/`max` are set).
 * @param options Optional `min`, `max`, and `step`.
 * @returns A tuple of `[count, controls]`. The controls object is stable.
 */
export function useCounter(
  initial = 0,
  options: UseCounterOptions = {},
): [number, UseCounterControls] {
  const { min = -Infinity, max = Infinity, step = 1 } = options;

  const [count, setCount] = useState(() => clamp(initial, min, max));

  const set = useCallback((value: number) => setCount(clamp(value, min, max)), [min, max]);
  const increment = useCallback(
    (by: number = step) => setCount((c) => clamp(c + by, min, max)),
    [min, max, step],
  );
  const decrement = useCallback(
    (by: number = step) => setCount((c) => clamp(c - by, min, max)),
    [min, max, step],
  );
  const reset = useCallback(() => setCount(clamp(initial, min, max)), [initial, min, max]);

  const controls = useMemo(
    () => ({ increment, decrement, set, reset }),
    [increment, decrement, set, reset],
  );

  return [count, controls];
}
