# Reference: primitives & browser hooks

Concise reference for the supporting hooks. All are importable from `hook-toolkit` and documented in source via JSDoc.

```ts
import { useLatest /* …any hook… */ } from 'hook-toolkit';
```

---

## Primitives

### `useLatest<T>(value): { current: T }`

A ref whose `.current` always holds the most recent value, updated during render. Read the latest value inside timers/listeners/async without stale closures or extra dependencies.

```tsx
const latest = useLatest(onChange);
useEffect(() => {
  const id = setInterval(() => latest.current(), 1000);
  return () => clearInterval(id);
}, []);
```

### `useIsMounted(): () => boolean`

Stable function reporting whether the component is still mounted. Guard `setState` after an `await`.

```tsx
const isMounted = useIsMounted();
const data = await load();
if (isMounted()) setData(data);
```

### `usePrevious<T>(value): T | undefined`

The value from the previous render (`undefined` on first render).

```tsx
const prev = usePrevious(count); // compare current vs previous
```

### `useDebounce<T>(value, delayMs = 300): T`

A debounced copy of `value` that updates only after changes settle.

```tsx
const debounced = useDebounce(query, 400);
useEffect(() => {
  if (debounced) search(debounced);
}, [debounced]);
```

### `useEventListener(type, handler, target?, options?)`

Add a DOM event listener with automatic cleanup and no stale closures. Typed overloads for `window` (default), `document`, element refs, and `MediaQueryList`. SSR-safe.

```tsx
useEventListener('keydown', (e) => e.key === 'Escape' && close());

const ref = useRef<HTMLDivElement>(null);
useEventListener('click', onClick, ref);
```

### `useInterval(callback, delayMs | null)`

Run `callback` on an interval without stale-closure bugs. Pass `null` to pause. Changing the callback does not reset the timer.

```tsx
useInterval(() => tick(), isRunning ? 1000 : null);
```

### `useTimeout(callback, delayMs | null)`

Run `callback` once after a delay, with cleanup. `null` disables; changing the delay restarts it.

```tsx
useTimeout(() => setVisible(false), visible ? 3000 : null);
```

### `useToggle(initial = false): [boolean, { toggle, setOn, setOff, set }]`

Boolean state with stable controls.

```tsx
const [isOpen, { toggle, setOff }] = useToggle();
```

### `useCounter(initial = 0, { min?, max?, step? }): [number, { increment, decrement, set, reset }]`

Numeric counter with optional clamping and a configurable step. The initial value is clamped into range.

```tsx
const [count, { increment, decrement }] = useCounter(0, { min: 0, max: 10 });
```

---

## Browser / DOM

> All browser hooks are SSR-safe: they return a deterministic value on the server/first paint and update after hydration.

### `useMediaQuery(query, { defaultValue? }): boolean`

Match a CSS media query reactively. `defaultValue` (default `false`) is used during SSR/first paint.

```tsx
const isDark = useMediaQuery('(prefers-color-scheme: dark)');
```

### `useWindowSize(): { width, height }`

Viewport dimensions, updated on resize. Starts at `{ width: 0, height: 0 }` on the server, then reads the real size in a layout effect.

```tsx
const { width } = useWindowSize();
```

### `useClickOutside(ref, handler, { enabled?, events? })`

Call `handler` on a pointer/touch interaction outside the referenced element. Listens on `mousedown` + `touchstart` by default.

```tsx
const ref = useRef<HTMLDivElement>(null);
useClickOutside(ref, () => setOpen(false));
```

### `useDocumentTitle(title, { restoreOnUnmount? })`

Set `document.title`; optionally restore the previous title on unmount.

```tsx
useDocumentTitle(`Inbox (${unread})`);
```

### `useClipboard({ resetDelay? }): { copy, copied, error }`

Copy text via the async Clipboard API with success feedback. `copy` resolves `true`/`false` and never throws. Requires a secure context (HTTPS/localhost).

```tsx
const { copy, copied } = useClipboard();
<button onClick={() => copy(url)}>{copied ? 'Copied!' : 'Copy'}</button>;
```

### `useNetworkStatus(): { online }`

Track online/offline status. Assumes `online: true` on the server; reflects `navigator.onLine` after hydration. Note: reports device connectivity, not whether your API is reachable.

```tsx
const { online } = useNetworkStatus();
```

### `useWebSocket<T>({ url, onMessageReceived?, disableInitialConnection? }): { isConnected, error, sendData, reconnect, closeConnection }`

Manage a WebSocket connection with connection state, error handling, typed messages, and automatic cleanup. `onMessageReceived` is always the latest callback (no stale closures). `sendData` returns `false` if the socket isn't open (frames are dropped, not queued). Reconnects when `url` changes; closes on unmount. SSR-safe (the socket is created in an effect). Does not auto-reconnect on drop — call `reconnect` yourself.

```tsx
const { isConnected, sendData, reconnect } = useWebSocket<ChatMessage>({
  url: 'wss://example.com/chat',
  onMessageReceived: (e) => appendMessage(e.data),
});
```

---

## Data fetching

### `useFetch<T>({ queryKey, queryFn, enabled?, keepPreviousData? }): { data, error, isLoading, isFetching, isError, isSuccess, isIdle, refetch }`

A tiny, typed, TanStack-Query-style query hook — data/loading/error + `refetch`, driven by `queryKey` + `queryFn(signal)`. **No cache, dedup, retries, or window-focus refetch** (use TanStack Query when you need those). Refetches when `queryKey` changes, aborts the previous request, and protects against stale responses. `keepPreviousData` keeps the current data visible while a new key loads (pagination). SSR-safe.

```tsx
const { data, isLoading, isError, refetch } = useFetch({
  queryKey: ['patient-allergy-list', patientUuid, pageIndex, pageSize],
  enabled: enabled && !skip,
  keepPreviousData: true,
  queryFn: (signal) => api.getPatientAllergy(/* … */, { signal }).then((r) => r.data),
});
```

### `useMutation<TData, TVars>(mutationFn, { onMutate?, onSuccess?, onError?, onSettled? }): { mutate, mutateAsync, data, error, status, isIdle, isPending, isError, isSuccess, reset }`

A tiny, typed, TanStack-Query-style mutation hook for POST/PUT/DELETE. `mutate` is fire-and-forget (errors → `onError`/`error`); `mutateAsync` is awaitable and **rejects** on error (so `await`/`try-catch`/`.finally()` work). Only the latest mutation updates state; updates after unmount are suppressed.

```tsx
const { mutateAsync: createAllergy, isPending } = useMutation(
  (vars: { patientAllergy: Allergy; xTENANTID?: string }) =>
    api.createPatientAllergy(vars.patientAllergy, vars.xTENANTID),
  { onSuccess: () => toast('Saved') },
);
await createAllergy({ patientAllergy, xTENANTID });
```

### `useRetry<T>(fn, { retries?, delay?, backoff?, onRetry?, shouldRetry? })`

Runs an async action and retries on failure with exponential backoff. `fn` receives an `AbortSignal` first. Returns `{ run, data, error, status, attempt, isLoading, isSuccess, isError, cancel, reset }`. `run` never rejects (resolves `{ data, error }`); `cancel` aborts the in-flight run including a pending backoff wait; cleaned up on unmount.

```tsx
const { run, attempt, error } = useRetry(
  (signal) => fetch('/api/flaky', { signal }).then((r) => r.json()),
  { retries: 4, delay: 400, backoff: 2, shouldRetry: (e) => !/4\d\d/.test(e.message) },
);
```

### `usePolling<T>(fn, { interval, enabled?, immediate?, onError? })`

Periodically runs `fn(signal)` and exposes the latest result. The next poll is scheduled only after the previous settles (no overlap). Returns `{ data, error, isPolling, lastUpdated, start, stop, refresh }`. Aborts in-flight work on stop/unmount. For a full server cache, prefer TanStack Query's `refetchInterval`.

```tsx
const { data, isPolling, stop } = usePolling(
  (signal) => fetch('/api/status', { signal }).then((r) => r.json()),
  { interval: 5000 },
);
```

### `useInfiniteScroll<T>(onLoadMore, { enabled?, root?, rootMargin?, threshold? }): { ref }`

Calls `onLoadMore` when a sentinel element scrolls into view (via `IntersectionObserver`). Fires once per entry into view, not continuously. Attach `ref` to a sentinel at the end of your list and gate `enabled` on your loading/has-more flags. SSR-safe.

```tsx
const { ref } = useInfiniteScroll(loadNextPage, {
  enabled: hasMore && !loading,
  rootMargin: '200px',
});
// <li ref={ref} aria-hidden /> at the end of the list
```

---

## UI state

### `useDisclosure<T>(initialOpen = false, { onOpen?, onClose? }): { opened, data, open, close, toggle }`

Open/close state for modals, drawers, dialogs, and popovers, with an optional **typed data payload** (the record you opened it for). All controls are referentially stable. The payload is stored by reference (no deep clone) — clone before passing if you need isolation.

```tsx
const dialog = useDisclosure<User>();
dialog.open(user); // dialog.opened === true, dialog.data === user
dialog.close(); // dialog.opened === false, dialog.data === undefined
```
