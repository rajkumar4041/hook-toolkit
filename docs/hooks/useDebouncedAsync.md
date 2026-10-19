# useDebouncedAsync

## What problem does it solve?

A search box or autocomplete needs three things that are easy to get wrong: debounce the input, cancel the previous request when a new one starts, and make sure a slow earlier response can't overwrite a newer one. `useDebouncedAsync` composes all three.

## Import

```ts
import { useDebouncedAsync } from 'hookflow';
```

## Minimal example

```tsx
const [query, setQuery] = useState('');
const { data, isLoading } = useDebouncedAsync(query, (q, signal) =>
  fetch(`/api/search?q=${q}`, { signal }).then((r) => r.json()),
);
```

## Real-world example

```tsx
function CitySearch() {
  const [query, setQuery] = useState('');
  const { data, isLoading, isDebouncing, error } = useDebouncedAsync(
    query,
    (q, signal) =>
      fetch(`/api/cities?q=${encodeURIComponent(q)}`, { signal }).then((r) => r.json()),
    { delay: 350, enabled: (q) => q.trim().length >= 2 },
  );

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search cities…"
      />
      {(isDebouncing || isLoading) && <Spinner />}
      {error && <p role="alert">{error.message}</p>}
      <ul>
        {data?.map((c: City) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## API & options

```ts
useDebouncedAsync<T, V>(
  value: V,
  fetcher: (value: V, signal: AbortSignal) => Promise<T>,
  options?: {
    delay?: number;                 // default 400 (ms)
    enabled?: (value: V) => boolean; // skip fetching for some values
    initialData?: T | null;          // default null
  },
): { data: T | null; error: Error | null; isLoading: boolean; isDebouncing: boolean; cancel: () => void }
```

- `value` — the input that drives fetching (usually a search query).
- `fetcher` — receives the settled value and an `AbortSignal`. Pass `signal` to `fetch` for real cancellation.
- `enabled` — return `false` to skip a fetch (e.g. empty/short queries).

## Return values

- `data` — latest successful result (or `initialData`).
- `error` — error from the latest non-aborted fetch.
- `isLoading` — a fetch for the settled value is in flight.
- `isDebouncing` — the value changed but the delay hasn't elapsed yet. Combine with `isLoading` for a "working" indicator.
- `cancel()` — abort the in-flight fetch and stop loading.

## Edge cases & limitations

- **Initial value is fetched immediately** (it's already "settled"); only _changes_ are debounced. Use `enabled` to skip an empty initial query.
- **Stale-result protection** relies on request ordering; a response from a superseded request is dropped even if it resolves last.
- **No cache.** Each settled value triggers a fetch. For caching/dedup across the app, feed the debounced value into TanStack Query / SWR instead.

## Tests & browser support

Covered by `useDebouncedAsync.test.ts`: immediate initial fetch + debounced changes, `isDebouncing`, `enabled` skipping, success data, abort-on-change, and stale-result suppression. Requires `AbortController` (all evergreen browsers; React 18+).
