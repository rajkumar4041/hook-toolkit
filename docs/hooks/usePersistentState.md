# usePersistentState

## What problem does it solve?

Persisting a piece of state to the browser normally means: read from storage, try/catch the JSON parse, write on every change, and listen for the `storage` event to sync other tabs — all while avoiding an SSR hydration mismatch. `usePersistentState` is a drop-in `useState` that does all of that.

## Import

```ts
import { usePersistentState } from 'react-hookflow';
```

## Minimal example

```tsx
const [theme, setTheme] = usePersistentState('theme', 'light');
<button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>{theme}</button>;
```

## Real-world example

```tsx
interface Filters {
  sort: 'new' | 'top';
  tags: string[];
}

function useSavedFilters() {
  const [filters, setFilters, reset] = usePersistentState<Filters>('feed.filters', {
    sort: 'new',
    tags: [],
  });

  const addTag = (tag: string) => setFilters((f) => ({ ...f, tags: [...f.tags, tag] }));

  return { filters, setFilters, addTag, reset };
}
```

Open the app in two tabs: changing the filters in one updates the other instantly.

## API & options

```ts
usePersistentState<T>(
  key: string,
  initialValue: T,
  options?: {
    storage?: 'local' | 'session';           // default 'local'
    serialize?: (value: T) => string;         // default JSON.stringify
    deserialize?: (raw: string) => T;         // default JSON.parse
    onError?: (error: unknown) => void;       // default console.warn
  },
): [T, SetPersistentState<T>, () => void]
```

- `key` — storage key.
- `initialValue` — used when nothing is stored and during SSR. Captured once (like `useState`'s initializer).
- `storage` — `'session'` clears on tab close.
- `serialize`/`deserialize` — override for non-JSON values (e.g. `Date`, `Map`).

## Return values

A tuple `[value, setValue, remove]`:

- `value: T` — current value.
- `setValue(next | (prev) => next)` — writes to storage and syncs all tabs/components on the same key.
- `remove()` — deletes the key and reverts to `initialValue`.

## Edge cases & limitations

- **SSR / first paint:** value is `initialValue` on the server and first client render, then updates to the stored value right after hydration. This prevents hydration mismatches; gate flash-sensitive UI on a mounted flag if needed.
- **Storage unavailable** (private mode, sandboxed iframe, disabled cookies): reads fall back to `initialValue`, writes are no-ops, and `onError` is called. The component still works in-memory for the session.
- **Corrupt stored JSON:** falls back to `initialValue` and calls `onError`.
- **Not for secrets:** data is stored in plain text.
- **Values must be serializable** by your `serialize` function.

## Tests & browser support

Covered by `usePersistentState.test.ts`: initial/stored values, updater form, remove, same-tab sync between two hooks, cross-tab `storage` events, sessionStorage, corrupt-JSON fallback, object values, and the no-`window` (SSR) path. Works in all evergreen browsers; requires React 18+ (`useSyncExternalStore`).
