# useAsyncAction

## What problem does it solve?

Every button that triggers an async operation needs the same plumbing: a loading flag, an error slot, a guard so double-clicks don't fire twice, cancellation, and a check that a slow response doesn't update an unmounted component. `useAsyncAction` wraps any async function with all of it.

## Import

```ts
import { useAsyncAction } from 'hook-toolkit';
```

## Minimal example

```tsx
const save = useAsyncAction(() => fetch('/api/save', { method: 'POST' }));

<button onClick={() => save.run()} disabled={save.isLoading}>
  {save.isLoading ? 'Saving…' : 'Save'}
</button>;
```

## Real-world example

```tsx
function DeleteButton({ id }: { id: string }) {
  const del = useAsyncAction(
    (signal, itemId: string) =>
      fetch(`/api/items/${itemId}`, { method: 'DELETE', signal }).then((r) => {
        if (!r.ok) throw new Error('Delete failed');
      }),
    { onSuccess: () => toast('Deleted') },
  );

  return (
    <>
      <button onClick={() => del.run(id)} disabled={del.isLoading}>
        {del.isLoading ? 'Deleting…' : 'Delete'}
      </button>
      {del.isError && <p role="alert">{del.error?.message}</p>}
    </>
  );
}
```

## API & options

```ts
useAsyncAction<T, A extends unknown[]>(
  fn: (signal: AbortSignal, ...args: A) => Promise<T>,
  options?: {
    onSuccess?: (data: T, args: A) => void;
    onError?: (error: Error, args: A) => void;
    allowConcurrent?: boolean; // default false
  },
): UseAsyncAction<T, A>
```

- `fn` — receives an `AbortSignal` first, then your `run` arguments. You may ignore the signal (a plain `() => Promise<T>` is assignable).
- `allowConcurrent` — `false` (default): while a run is in flight, further `run` calls are ignored and return the in-flight promise (double-submit guard). `true`: a new run aborts and supersedes the previous; only the latest updates state.

## Return values

```ts
{
  run: (...args: A) => Promise<{ data: T | null; error: Error | null }>; // never rejects
  data: T | null;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isIdle; isLoading; isSuccess; isError: boolean;
  cancel: () => void; // abort in-flight; keep prior data
  reset: () => void;  // abort + back to idle, clear data/error
}
```

`run` resolves to a result object and **never rejects**, so `await run()` is always safe and won't create unhandled rejections. The error is also stored in `error`.

## Edge cases & limitations

- **Cancellation** only aborts the network if your `fn` passes `signal` to `fetch`/XHR. Without it, hook-toolkit still protects against stale state updates, but the request itself keeps running.
- **Unmount:** the in-flight run is aborted and no state is set after unmount.
- **Not a cache.** For shared server state, dedup, and invalidation across components, use TanStack Query. This hook manages one component's async action.

## Tests & browser support

Covered by `useAsyncAction.test.ts`: idle→loading→success/error transitions, `run` never rejecting, double-submit guard, `AbortSignal` passing + abort on supersede, stale-result suppression, `reset`, and no-state-update-after-unmount. Requires `AbortController` (all evergreen browsers; React 18+).
