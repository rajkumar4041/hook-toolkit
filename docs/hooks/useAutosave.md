# useAutosave

## What problem does it solve?

Autosave looks simple and never is: debounce the save, show accurate `saving / saved / error` status, only save when the data actually changed, abort a superseded save, handle failure, and don't save on mount. `useAutosave` packages all of it.

## Import

```ts
import { useAutosave } from 'hook-toolkit';
```

## Minimal example

```tsx
const { status } = useAutosave(draft, (data) => api.saveDraft(data));
<span>{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}</span>;
```

## Real-world example

```tsx
function Editor() {
  const [doc, setDoc] = useState({ title: '', body: '' });

  const { status, isDirty, lastSavedAt, error, saveNow } = useAutosave(
    doc,
    (data, signal) =>
      fetch('/api/doc', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal,
      }).then((r) => {
        if (!r.ok) throw new Error('Could not save');
      }),
    { delay: 1500 },
  );

  return (
    <>
      <input value={doc.title} onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))} />
      <textarea
        value={doc.body}
        onChange={(e) => setDoc((d) => ({ ...d, body: e.target.value }))}
      />
      <footer>
        {status === 'saving' && 'Saving…'}
        {status === 'saved' && `Saved ${new Date(lastSavedAt!).toLocaleTimeString()}`}
        {status === 'error' && (
          <>
            <span role="alert">{error?.message}</span> <button onClick={saveNow}>Retry</button>
          </>
        )}
        {isDirty && status !== 'saving' && ' • Unsaved changes'}
      </footer>
    </>
  );
}
```

## API & options

```ts
useAutosave<T>(
  data: T,
  onSave: (data: T, signal: AbortSignal) => Promise<unknown>,
  options?: {
    delay?: number;                  // default 1000 (ms)
    enabled?: boolean;               // default true
    serialize?: (data: T) => string; // default JSON.stringify (change detection)
    onError?: (error: Error) => void;
  },
): { status; error; lastSavedAt; isSaving; isDirty; saveNow }
```

- `data` — the value to persist. A save is scheduled when `serialize(data)` differs from the last saved value.
- `onSave` — reject to signal failure (status becomes `error`, data stays dirty). Receives an `AbortSignal`.
- `enabled: false` — pauses automatic saving; `saveNow()` still works.

## Return values

- `status: 'idle' | 'saving' | 'saved' | 'error'`.
- `error: Error | null`.
- `lastSavedAt: number | null` — epoch ms of the last successful save.
- `isSaving: boolean`.
- `isDirty: boolean` — current data differs from last saved.
- `saveNow(): Promise<void>` — flush immediately, bypassing the debounce.

## Edge cases & limitations

- **No save on mount** — the initial data is treated as already saved.
- **Change detection** defaults to `JSON.stringify`. For non-JSON-serializable data (functions, circular refs), pass a custom `serialize`.
- **Superseded/aborted saves** never update status; only the newest save wins. In-flight saves are aborted on unmount — provide a server-side idempotency strategy if a final in-flight save must not be lost on navigation (pair with [`useUnsavedChanges`](./useUnsavedChanges.md)).
- **Not a sync engine.** For offline queues / conflict resolution, use a dedicated solution.

## Tests & browser support

Covered by `useAutosave.test.ts`: no-save-on-mount, dirty detection + debounced save, coalescing rapid edits, error status + `onError` + stays dirty, `saveNow` flush, and the `enabled: false` pause. Requires `AbortController` (all evergreen browsers; React 18+).
