import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { isBrowser } from '../utils/isBrowser';

export interface PersistentStateOptions<T> {
  /** Which Web Storage to use. Defaults to `'local'` (survives tab close). */
  storage?: 'local' | 'session';
  /** Serialize a value to a string. Defaults to `JSON.stringify`. */
  serialize?: (value: T) => string;
  /** Parse a stored string back to a value. Defaults to `JSON.parse`. */
  deserialize?: (raw: string) => T;
  /**
   * Called when reading/parsing/writing storage fails (quota, private mode,
   * corrupt JSON). Defaults to `console.warn`.
   */
  onError?: (error: unknown) => void;
}

export type SetPersistentState<T> = (update: T | ((prev: T) => T)) => void;

type Updater<T> = T | ((prev: T) => T);

// Same-tab writes don't trigger the native `storage` event, so we broadcast our
// own event to keep every hook bound to the same key in sync within one tab.
const INTERNAL_EVENT = 'hookflow:persistent-state';

interface InternalEventDetail {
  key: string;
}

function getStorage(kind: 'local' | 'session'): Storage | null {
  if (!isBrowser) return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    // Accessing storage can throw (e.g. sandboxed iframes, disabled cookies).
    return null;
  }
}

/**
 * `useState` that persists to `localStorage`/`sessionStorage`, stays in sync
 * across browser tabs, and renders safely during SSR.
 *
 * Replaces the usual read-from-storage / try-catch-parse / write-on-change /
 * listen-for-`storage`-events boilerplate with a drop-in `useState` API.
 *
 * @example
 * ```tsx
 * const [theme, setTheme] = usePersistentState('theme', 'light');
 * setTheme((t) => (t === 'light' ? 'dark' : 'light'));
 * ```
 *
 * ### SSR / hydration
 * During server rendering and the first client paint the value is
 * `initialValue` (the server cannot read browser storage). Immediately after
 * hydration the hook re-reads storage and updates — this is intentional and
 * prevents hydration mismatches. Gate any storage-dependent UI on a mounted
 * flag if the flash of the default value is undesirable.
 *
 * @param key          Storage key.
 * @param initialValue Value used when nothing is stored (and during SSR).
 * @param options      Storage kind, custom (de)serialization, error handling.
 * @returns `[value, setValue, remove]`. `remove` deletes the key and reverts to `initialValue`.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  options: PersistentStateOptions<T> = {},
): [T, SetPersistentState<T>, () => void] {
  const {
    storage: storageKind = 'local',
    serialize = JSON.stringify as (value: T) => string,
    deserialize = JSON.parse as (raw: string) => T,
    onError = (error: unknown) => console.warn('[usePersistentState]', error),
  } = options;

  // Keep the very first `initialValue` stable even if the caller passes a new
  // object literal each render — matching `useState` initial-value semantics.
  const initialRef = useRef(initialValue);
  // Latest option callbacks, read lazily so we never stale-close over them.
  const optsRef = useRef({ serialize, deserialize, onError, storageKind });
  optsRef.current = { serialize, deserialize, onError, storageKind };

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isBrowser) return () => {};
      const handleStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) onStoreChange();
      };
      const handleInternal = (event: Event) => {
        if ((event as CustomEvent<InternalEventDetail>).detail?.key === key) onStoreChange();
      };
      window.addEventListener('storage', handleStorage);
      window.addEventListener(INTERNAL_EVENT, handleInternal);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(INTERNAL_EVENT, handleInternal);
      };
    },
    [key],
  );

  // Returns the raw stored string (a primitive, so stable under Object.is).
  const getSnapshot = useCallback((): string | null => {
    const store = getStorage(optsRef.current.storageKind);
    if (!store) return null;
    try {
      return store.getItem(key);
    } catch (error) {
      optsRef.current.onError(error);
      return null;
    }
  }, [key]);

  const getServerSnapshot = useCallback((): string | null => null, []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<T>(() => {
    if (raw === null) return initialRef.current;
    try {
      return optsRef.current.deserialize(raw);
    } catch (error) {
      optsRef.current.onError(error);
      return initialRef.current;
    }
  }, [raw]);

  // Keep a live ref to the current value so the updater form reads fresh data
  // without `value` being a dependency of `setValue`.
  const valueRef = useRef(value);
  valueRef.current = value;

  const setValue = useCallback<SetPersistentState<T>>(
    (update) => {
      const store = getStorage(optsRef.current.storageKind);
      const next =
        typeof update === 'function'
          ? (update as (prev: T) => T)(valueRef.current)
          : update;
      if (store) {
        try {
          store.setItem(key, optsRef.current.serialize(next));
        } catch (error) {
          optsRef.current.onError(error);
        }
      }
      if (isBrowser) {
        window.dispatchEvent(
          new CustomEvent<InternalEventDetail>(INTERNAL_EVENT, { detail: { key } }),
        );
      }
    },
    [key],
  );

  const remove = useCallback(() => {
    const store = getStorage(optsRef.current.storageKind);
    if (store) {
      try {
        store.removeItem(key);
      } catch (error) {
        optsRef.current.onError(error);
      }
    }
    if (isBrowser) {
      window.dispatchEvent(
        new CustomEvent<InternalEventDetail>(INTERNAL_EVENT, { detail: { key } }),
      );
    }
  }, [key]);

  return [value, setValue, remove];
}

// `Updater` is exported-adjacent type used in the setter signature above.
export type { Updater as PersistentStateUpdater };
