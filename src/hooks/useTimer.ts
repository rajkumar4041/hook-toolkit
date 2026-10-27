import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLatest } from './useLatest';

export interface UseTimerOptions {
  /** Starting time in milliseconds. For a countdown this is the amount to count down from. Defaults to 0. */
  initialTime?: number;
  /** Tick size in milliseconds. Defaults to 1000 (one second). */
  interval?: number;
  /** Start running immediately. Defaults to false. */
  autoStart?: boolean;
  /** Count down toward 0 instead of up. Defaults to false (stopwatch). */
  countdown?: boolean;
  /** Called once when a countdown reaches 0. Ignored for a stopwatch. */
  onEnd?: () => void;
}

export interface UseTimerResult {
  /** Current time in milliseconds. */
  time: number;
  /** Whether the timer is currently ticking. */
  isRunning: boolean;
  /** Start ticking (resets to `initialTime` first). */
  start: () => void;
  /** Pause, keeping the current time. */
  pause: () => void;
  /** Resume from the current time. */
  resume: () => void;
  /** Stop and reset the time to `initialTime` (or a provided value). */
  restart: (newTime?: number) => void;
}

/**
 * A start/pause/resume/restart timer that counts up (stopwatch) or down
 * (countdown) — for OTP resend cooldowns, session-expiry warnings, quiz
 * timers, and elapsed-time displays.
 *
 * A countdown stops at 0 and fires `onEnd` once. All controls are stable.
 *
 * @example
 * ```tsx
 * // 30s resend cooldown
 * const { time, isRunning, restart } = useTimer({
 *   initialTime: 30_000,
 *   countdown: true,
 *   onEnd: () => setCanResend(true),
 * });
 * ```
 *
 * @param options `initialTime`, `interval`, `autoStart`, `countdown`, `onEnd`.
 */
export function useTimer(options: UseTimerOptions = {}): UseTimerResult {
  const { initialTime = 0, interval = 1000, autoStart = false, countdown = false } = options;

  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const onEndRef = useLatest(options.onEnd);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalId.current !== null) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    intervalId.current = setInterval(() => {
      setTime((t) => {
        if (!countdown) return t + interval;
        const next = t - interval;
        if (next <= 0) {
          clear();
          setIsRunning(false);
          onEndRef.current?.();
          return 0;
        }
        return next;
      });
    }, interval);
    return clear;
  }, [isRunning, interval, countdown, clear, onEndRef]);

  const start = useCallback(() => {
    setTime(initialTime);
    setIsRunning(true);
  }, [initialTime]);

  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => {
    if (countdown && time <= 0) return;
    setIsRunning(true);
  }, [countdown, time]);

  const restart = useCallback(
    (newTime: number = initialTime) => {
      clear();
      setTime(newTime);
      setIsRunning(false);
    },
    [initialTime, clear],
  );

  return useMemo(
    () => ({ time, isRunning, start, pause, resume, restart }),
    [time, isRunning, start, pause, resume, restart],
  );
}
