import { useCallback, useMemo, useState } from 'react';

export interface UseStepOptions {
  /** Step to start on (1-based). Clamped into range. Defaults to 1. */
  initial?: number;
  /** When true, `next` past the last step wraps to the first and `back` wraps the other way. Defaults to false. */
  loop?: boolean;
}

export interface UseStepControls {
  /** Jump to a specific step (1-based). Clamped into `[1, totalSteps]`. */
  setStep: (step: number) => void;
  /** Advance one step. Wraps to the first step when `loop` is set. */
  next: () => void;
  /** Go back one step. Wraps to the last step when `loop` is set. */
  back: () => void;
  /** Return to the initial step. */
  reset: () => void;
  /** Whether `next` can advance (always true when `loop` is set). */
  canNext: boolean;
  /** Whether `back` can go back (always true when `loop` is set). */
  canBack: boolean;
  /** Whether the current step is the first. */
  isFirst: boolean;
  /** Whether the current step is the last. */
  isLast: boolean;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Manages 1-based step state for wizards, onboarding flows, and multi-step
 * forms — the repetitive "which step am I on, can I go next/back?" bookkeeping
 * in one typed object of stable controls.
 *
 * @example
 * ```tsx
 * const [step, { next, back, canNext, isLast }] = useStep(3);
 * <button onClick={back} disabled={!canBack}>Back</button>
 * <button onClick={next}>{isLast ? 'Finish' : 'Next'}</button>
 * ```
 *
 * @param totalSteps Number of steps (must be at least 1).
 * @param options    `initial` (1-based start) and `loop`.
 * @returns A tuple of `[step, controls]`. The controls object is stable per state.
 */
export function useStep(totalSteps: number, options: UseStepOptions = {}): [number, UseStepControls] {
  const { initial = 1, loop = false } = options;
  const max = Math.max(1, Math.floor(totalSteps));

  const [step, setStepState] = useState(() => clamp(Math.floor(initial), 1, max));

  const setStep = useCallback((next: number) => setStepState(clamp(Math.floor(next), 1, max)), [max]);

  const next = useCallback(
    () => setStepState((s) => (s >= max ? (loop ? 1 : s) : s + 1)),
    [max, loop],
  );
  const back = useCallback(
    () => setStepState((s) => (s <= 1 ? (loop ? max : s) : s - 1)),
    [max, loop],
  );
  const reset = useCallback(() => setStepState(clamp(Math.floor(initial), 1, max)), [initial, max]);

  const isFirst = step <= 1;
  const isLast = step >= max;

  const controls = useMemo(
    () => ({
      setStep,
      next,
      back,
      reset,
      canNext: loop || !isLast,
      canBack: loop || !isFirst,
      isFirst,
      isLast,
    }),
    [setStep, next, back, reset, loop, isFirst, isLast],
  );

  return [step, controls];
}
