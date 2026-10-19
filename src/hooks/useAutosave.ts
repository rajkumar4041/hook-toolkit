import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatest } from './useLatest';
import { useIsMounted } from './useIsMounted';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutosaveOptions<T> {
  /** Inactivity delay before saving, in ms. Defaults to 1000. */
  delay?: number;
  /** When `false`, automatic saving is paused (`saveNow` still works). Defaults to `true`. */
  enabled?: boolean;
  /**
   * Serializes data for change detection. Defaults to `JSON.stringify`. A save
   * is only scheduled when the serialized value differs from the last saved one.
   */
  serialize?: (data: T) => string;
  /** Called when a save rejects. */
  onError?: (error: Error) => void;
}

export interface UseAutosaveResult {
  status: SaveStatus;
  error: Error | null;
  /** Epoch ms of the last successful save, or `null`. */
  lastSavedAt: number | null;
  isSaving: boolean;
  /** Current data differs from what was last saved. */
  isDirty: boolean;
  /** Flush a save immediately (bypasses the debounce). Resolves when settled. */
  saveNow: () => Promise<void>;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Automatically saves data after the user stops editing, exposing a precise
 * save-status machine and handling failures.
 *
 * Eliminates the hand-rolled "debounce a save, track saving/saved/error, diff
 * against the last saved value, abort the previous request, guard unmount"
 * dance that every autosaving form reinvents.
 *
 * @example
 * ```tsx
 * const { status, isDirty, lastSavedAt, saveNow } = useAutosave(
 *   draft,
 *   (data, signal) => fetch('/api/draft', {
 *     method: 'PUT', body: JSON.stringify(data), signal,
 *   }).then((r) => { if (!r.ok) throw new Error('Save failed'); }),
 *   { delay: 1500 },
 * );
 *
 * <span>{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}</span>
 * ```
 *
 * The latest in-flight save is aborted when a newer one starts or on unmount;
 * only the newest save updates status (stale-result protection). No save fires
 * on mount — the initial data is treated as already-saved.
 *
 * @param data   The data to persist. Change detection uses `serialize`.
 * @param onSave `(data, signal) => Promise<unknown>`. Reject to signal failure.
 * @param options `delay`, `enabled`, `serialize`, `onError`.
 */
export function useAutosave<T>(
  data: T,
  onSave: (data: T, signal: AbortSignal) => Promise<unknown>,
  options: UseAutosaveOptions<T> = {},
): UseAutosaveResult {
  const { delay = 1000, enabled = true } = options;
  const serialize = options.serialize ?? (JSON.stringify as (data: T) => string);

  const onSaveRef = useLatest(onSave);
  const onErrorRef = useLatest(options.onError);
  const serializeRef = useLatest(serialize);
  const dataRef = useLatest(data);
  const isMounted = useIsMounted();

  const serialized = serialize(data);

  // Treat the initial data as already saved so mounting never triggers a save.
  const [lastSaved, setLastSaved] = useState<string>(() => serialized);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const isDirty = serialized !== lastSaved;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const save = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const snapshot = serializeRef.current(dataRef.current);

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++requestIdRef.current;
    const isCurrent = () => requestIdRef.current === id && isMounted();

    setStatus('saving');
    setError(null);
    try {
      await onSaveRef.current(dataRef.current, controller.signal);
      if (!isCurrent()) return;
      setLastSaved(snapshot);
      setLastSavedAt(Date.now());
      setStatus('saved');
    } catch (err) {
      if (controller.signal.aborted || !isCurrent()) return;
      const e = toError(err);
      setError(e);
      setStatus('error');
      onErrorRef.current?.(e);
    }
  }, [serializeRef, dataRef, onSaveRef, onErrorRef, isMounted]);

  // Schedule a debounced save whenever the data becomes dirty.
  useEffect(() => {
    if (!enabled || !isDirty) return;
    timerRef.current = setTimeout(() => {
      void save();
    }, delay);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [serialized, isDirty, enabled, delay, save]);

  // Abort any in-flight save on unmount.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    status,
    error,
    lastSavedAt,
    isSaving: status === 'saving',
    isDirty,
    saveNow: save,
  };
}
