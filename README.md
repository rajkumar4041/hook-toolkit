# hook-toolkit

> Production-ready React hooks that eliminate entire repetitive **workflows** — not just another grab-bag of primitives.

[![CI](https://github.com/rajkumar4041/react-hooks/actions/workflows/ci.yml/badge.svg)](https://github.com/rajkumar4041/react-hooks/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/hook-toolkit.svg)](https://www.npmjs.com/package/hook-toolkit)
[![types](https://img.shields.io/npm/types/hook-toolkit.svg)](https://www.npmjs.com/package/hook-toolkit)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/hook-toolkit.svg)](https://bundlephobia.com/package/hook-toolkit)
[![docs](https://img.shields.io/badge/docs-website-brightgreen.svg)](https://hook-toolkit-document-8azd.vercel.app/)

📖 **Documentation site:** [hook-toolkit-document-8azd.vercel.app](https://hook-toolkit-document-8azd.vercel.app/)

> **Current version:** `0.3.0` — 32 hooks.

`hook-toolkit` is a lightweight, TypeScript-first collection of React hooks. Its five flagship hooks are the differentiator: they compose the **hard, bug-prone parts** that other libraries leave to you — request cancellation, stale-result races, cross-tab sync, save-status machines, and unsaved-change guards — behind a one-line API.

- **Zero runtime dependencies.** React is the only peer dependency.
- **TypeScript-first.** Full generics and inference; no `any` in the codebase.
- **SSR-safe & Strict-Mode safe.** Browser hooks never touch `window`/`document` during server render and avoid hydration mismatches.
- **Tree-shakeable.** ESM + CJS builds, `sideEffects: false`.
- **Tested.** 142 tests covering async/cancellation/stale-results/retry, SSR, timers, observers, and cleanup.

---

## Table of contents

- [Installation](#installation)
- [Why hook-toolkit? (before / after)](#why-hook-toolkit-before--after)
- [Hook directory](#hook-directory)
- [Complete API reference](#complete-api-reference)
  - [Flagship: usePersistentState](#usepersistentstate)
  - [Flagship: useAsyncAction](#useasyncaction)
  - [Flagship: useDebouncedAsync](#usedebouncedasync)
  - [Flagship: useAutosave](#useautosave)
  - [Flagship: useUnsavedChanges](#useunsavedchanges)
  - [Primitives](#primitives-1)
  - [Browser / DOM](#browser--dom-1)
- [When to use hook-toolkit vs. alternatives](#when-to-use-hook-toolkit-vs-alternatives)
- [SSR & hydration](#ssr--hydration)
- [TypeScript](#typescript)
- [Compatibility & browser support](#compatibility--browser-support)
- [Local development](#local-development)
- [FAQ & troubleshooting](#faq--troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
npm install hook-toolkit
# or: pnpm add hook-toolkit / yarn add hook-toolkit
```

**Requirements:** React **18+** (uses `useSyncExternalStore`), Node **18+** for development. Works in all evergreen browsers.

Full interactive docs are at **[hook-toolkit-document-8azd.vercel.app](https://hook-toolkit-document-8azd.vercel.app/)**.

---

## Why hook-toolkit? (before / after)

The promise is specific and measurable: **for the workflows it targets, hook-toolkit cuts the boilerplate by roughly half or more.** Here is the evidence, not a slogan.

### Debounced, cancelable search (`useDebouncedAsync`)

A correct search box needs: debounce, request cancellation, and protection against a slow earlier response overwriting a newer one. Done by hand:

```tsx
// BEFORE — ~34 lines, and still missing edge cases
function Search() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const latestRequest = useRef(0);

  useEffect(() => {
    if (!query.trim()) return;
    const handle = setTimeout(() => {
      const requestId = ++latestRequest.current;
      const controller = new AbortController();
      setLoading(true);
      fetch(`/api/search?q=${query}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((result) => {
          if (requestId === latestRequest.current) {
            setData(result);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted && requestId === latestRequest.current) {
            setLoading(false);
          }
        });
      return () => controller.abort();
    }, 400);
    return () => clearTimeout(handle);
  }, [query]);
  // ...render
}
```

```tsx
// AFTER — ~8 lines, with the same guarantees
function Search() {
  const [query, setQuery] = useState('');
  const { data, isLoading } = useDebouncedAsync(
    query,
    (q, signal) => fetch(`/api/search?q=${q}`, { signal }).then((r) => r.json()),
    { delay: 400, enabled: (q) => q.trim().length > 0 },
  );
  // ...render
}
```

**~34 → ~8 lines (~76% less), and the stale-result + cancellation bugs are handled for you.**

### Persisted, cross-tab state (`usePersistentState`)

```tsx
// BEFORE — ~22 lines: read, parse, guard, write, listen for other tabs
const [theme, setTheme] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('theme')) ?? 'light';
  } catch {
    return 'light';
  }
});
useEffect(() => {
  try {
    localStorage.setItem('theme', JSON.stringify(theme));
  } catch {}
}, [theme]);
useEffect(() => {
  const onStorage = (e) => {
    if (e.key === 'theme' && e.newValue) {
      try {
        setTheme(JSON.parse(e.newValue));
      } catch {}
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}, []);
// ...and it still flashes/mismatches under SSR
```

```tsx
// AFTER — 1 line, cross-tab sync and SSR safety included
const [theme, setTheme] = usePersistentState('theme', 'light');
```

**~22 → 1 line.**

### Autosaving form (`useAutosave`)

```tsx
// AFTER — debounce + saving/saved/error status + failure handling, in a few lines
const { status, isDirty, saveNow } = useAutosave(draft, (data, signal) =>
  fetch('/api/draft', { method: 'PUT', body: JSON.stringify(data), signal }).then((r) => {
    if (!r.ok) throw new Error('Save failed');
  }),
);
```

> We measure boilerplate reduction per targeted task with concrete code, as above. We do **not** claim a blanket "50% more productive developer" — that is not something a hooks library can honestly promise.

---

## Hook directory

**28 hooks** across five categories. Jump to any hook's full entry in the [Complete API reference](#complete-api-reference).

### 🚩 Flagship workflow hooks (5)

| #   | Hook                                        | What it eliminates                                                       |
| --- | ------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | [`usePersistentState`](#usepersistentstate) | localStorage/sessionStorage + cross-tab sync + SSR/hydration safety      |
| 2   | [`useAsyncAction`](#useasyncaction)         | loading/error state + double-submit guard + cancellation + stale results |
| 3   | [`useDebouncedAsync`](#usedebouncedasync)   | debounce + cancellation + stale-result protection (search/autocomplete)  |
| 4   | [`useAutosave`](#useautosave)               | debounced save + status machine + failure handling                       |
| 5   | [`useUnsavedChanges`](#useunsavedchanges)   | `beforeunload` guard + router navigation confirmation                    |

### 🔧 Primitives (9)

| #   | Hook                                | Purpose                                                 |
| --- | ----------------------------------- | ------------------------------------------------------- |
| 6   | [`useLatest`](#primitives-1)        | always-fresh ref to avoid stale closures                |
| 7   | [`useIsMounted`](#primitives-1)     | guard `setState` after `await`                          |
| 8   | [`usePrevious`](#primitives-1)      | value from the previous render                          |
| 9   | [`useDebounce`](#primitives-1)      | debounced value                                         |
| 10  | [`useEventListener`](#primitives-1) | typed, auto-cleanup DOM event listener (SSR-safe)       |
| 11  | [`useInterval`](#primitives-1)      | `setInterval` with no stale-closure bugs; `null` pauses |
| 12  | [`useTimeout`](#primitives-1)       | `setTimeout` with cleanup; `null` disables              |
| 13  | [`useToggle`](#primitives-1)        | boolean with `toggle`/`setOn`/`setOff`/`set`            |
| 14  | [`useCounter`](#primitives-1)       | numeric counter with clamping and step                  |

### 🌐 Browser / DOM (9)

| #   | Hook                                  | Purpose                                                   |
| --- | ------------------------------------- | --------------------------------------------------------- |
| 15  | [`useMediaQuery`](#browser--dom-1)    | match a CSS media query reactively                        |
| 16  | [`useWindowSize`](#browser--dom-1)    | viewport dimensions, updated on resize                    |
| 17  | [`useClickOutside`](#browser--dom-1)  | detect clicks outside an element                          |
| 18  | [`useDocumentTitle`](#browser--dom-1) | set `document.title`, optional restore                    |
| 19  | [`useClipboard`](#browser--dom-1)     | copy text with success/error feedback                     |
| 20  | [`useNetworkStatus`](#browser--dom-1) | online/offline status                                     |
| 21  | [`useWebSocket`](#browser--dom-1)     | WebSocket connection with state, send, reconnect, cleanup |
| 22  | [`useHotkey`](#browser--dom-1)        | run a handler on a key or key-combo press                 |
| 23  | [`useIdle`](#browser--dom-1)          | detect user inactivity after a timeout                    |

### 📡 Data fetching (6)

| #   | Hook                                     | Purpose                                                             |
| --- | ---------------------------------------- | ------------------------------------------------------------------- |
| 24  | [`useFetch`](#data-fetching)             | TanStack-Query-lite query: `queryKey`/`queryFn`, data/loading/error |
| 25  | [`useMutation`](#data-fetching)          | TanStack-Query-lite mutation: `mutate`/`mutateAsync`, `isPending`   |
| 26  | [`useInvalidateQueries`](#data-fetching) | refetch mounted `useFetch`es by key (one key or many)               |
| 27  | [`useRetry`](#data-fetching)             | retry an async action with exponential backoff                      |
| 28  | [`usePolling`](#data-fetching)           | poll an async function on an interval, no overlap                   |
| 29  | [`useInfiniteScroll`](#data-fetching)    | load more when a sentinel scrolls into view                         |

### 🧩 UI state (3)

| #   | Hook                         | Purpose                                                  |
| --- | ---------------------------- | -------------------------------------------------------- |
| 30  | [`useDisclosure`](#ui-state) | modal/drawer/dialog open-state with a typed data payload |
| 31  | [`useStep`](#ui-state)       | 1-based step state for wizards and multi-step forms      |
| 32  | [`useTimer`](#ui-state)      | stopwatch / countdown timer with start/pause/restart     |

Per-hook deep-dive pages for the flagships live in [`docs/`](./docs/README.md). The complete reference is also inline below.

---

## Complete API reference

Every hook, with signature, example, options, and return value. All hooks import from the package root:

```ts
import { usePersistentState, useAsyncAction /* … */ } from 'hook-toolkit';
```

### usePersistentState

`useState` persisted to Web Storage, synced across tabs, SSR-safe.

```ts
usePersistentState<T>(
  key: string,
  initialValue: T,
  options?: {
    storage?: 'local' | 'session';     // default 'local'
    serialize?: (value: T) => string;  // default JSON.stringify
    deserialize?: (raw: string) => T;  // default JSON.parse
    onError?: (error: unknown) => void;
  },
): [value: T, setValue: (next: T | ((prev: T) => T)) => void, remove: () => void]
```

```tsx
const [theme, setTheme] = usePersistentState('theme', 'light');
setTheme((t) => (t === 'light' ? 'dark' : 'light'));
```

- **Returns** `[value, setValue, remove]`. `setValue` accepts a value or updater; `remove()` deletes the key and reverts to `initialValue`.
- **SSR:** `initialValue` on server/first paint, then the stored value after hydration (prevents mismatches).
- **Robust:** corrupt JSON or unavailable storage falls back to `initialValue` and calls `onError`.
- Full page → [docs/hooks/usePersistentState.md](./docs/hooks/usePersistentState.md)

### useAsyncAction

Async state with a double-submit guard, cancellation, and stale-result protection.

```ts
useAsyncAction<T, A extends unknown[]>(
  fn: (signal: AbortSignal, ...args: A) => Promise<T>,
  options?: {
    onSuccess?: (data: T, args: A) => void;
    onError?: (error: Error, args: A) => void;
    allowConcurrent?: boolean; // default false (ignore while in flight)
  },
): {
  run: (...args: A) => Promise<{ data: T | null; error: Error | null }>; // never rejects
  data: T | null; error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  isIdle; isLoading; isSuccess; isError: boolean;
  cancel: () => void; reset: () => void;
}
```

```tsx
const save = useAsyncAction((signal, body: FormData) =>
  fetch('/api/save', { method: 'POST', body, signal }).then((r) => {
    if (!r.ok) throw new Error('Save failed');
    return r.json();
  }),
);
<button onClick={() => save.run(formData)} disabled={save.isLoading}>
  Save
</button>;
{
  save.isError && <p role="alert">{save.error?.message}</p>;
}
```

- `fn` receives an `AbortSignal` first (ignore it if you don't need cancellation — `() => Promise<T>` is assignable).
- `run` **never rejects**; outcome is `{ data, error }` and also mirrored in state.
- Full page → [docs/hooks/useAsyncAction.md](./docs/hooks/useAsyncAction.md)

### useDebouncedAsync

Debounced, cancelable fetching for search/autocomplete, with stale-result protection.

```ts
useDebouncedAsync<T, V>(
  value: V,
  fetcher: (value: V, signal: AbortSignal) => Promise<T>,
  options?: {
    delay?: number;                  // default 400 ms
    enabled?: (value: V) => boolean; // skip some values (e.g. empty)
    initialData?: T | null;          // default null
  },
): { data: T | null; error: Error | null; isLoading: boolean; isDebouncing: boolean; cancel: () => void }
```

```tsx
const [query, setQuery] = useState('');
const { data, isLoading, isDebouncing } = useDebouncedAsync(
  query,
  (q, signal) => fetch(`/api/search?q=${q}`, { signal }).then((r) => r.json()),
  { delay: 400, enabled: (q) => q.trim().length > 0 },
);
```

- Initial (settled) value is fetched immediately; only _changes_ are debounced.
- `isDebouncing` = change pending; `isLoading` = request in flight.
- Full page → [docs/hooks/useDebouncedAsync.md](./docs/hooks/useDebouncedAsync.md)

### useAutosave

Debounced autosave with an `idle → saving → saved → error` status machine.

```ts
useAutosave<T>(
  data: T,
  onSave: (data: T, signal: AbortSignal) => Promise<unknown>,
  options?: {
    delay?: number;                  // default 1000 ms
    enabled?: boolean;               // default true
    serialize?: (data: T) => string; // default JSON.stringify (change detection)
    onError?: (error: Error) => void;
  },
): {
  status: 'idle' | 'saving' | 'saved' | 'error';
  error: Error | null; lastSavedAt: number | null;
  isSaving: boolean; isDirty: boolean;
  saveNow: () => Promise<void>;
}
```

```tsx
const { status, isDirty, saveNow } = useAutosave(draft, (data, signal) =>
  fetch('/api/draft', { method: 'PUT', body: JSON.stringify(data), signal }).then((r) => {
    if (!r.ok) throw new Error('Save failed');
  }),
);
```

- Never saves on mount (initial data is treated as saved). Only the newest save updates status; superseded saves are aborted.
- Full page → [docs/hooks/useAutosave.md](./docs/hooks/useAutosave.md)

### useUnsavedChanges

Warn before leaving a page with unsaved edits, plus a router-guard helper.

```ts
useUnsavedChanges(
  when: boolean,
  options?: { enabled?: boolean; message?: string },
): { confirmNavigation: () => boolean }
```

```tsx
const { confirmNavigation } = useUnsavedChanges(form.isDirty);
// Full-page unload is guarded automatically. For SPA navigation:
if (confirmNavigation()) router.push('/next');
```

- Native `beforeunload` text is browser-controlled (custom `message` ignored there). `beforeunload` does not fire on SPA route changes — use `confirmNavigation` with your router.
- Full page → [docs/hooks/useUnsavedChanges.md](./docs/hooks/useUnsavedChanges.md)

### Primitives

```tsx
// useLatest<T>(value): { current: T } — always-fresh ref, no stale closures
const latest = useLatest(onChange);

// useIsMounted(): () => boolean — guard setState after await
const isMounted = useIsMounted();
if (isMounted()) setData(data);

// usePrevious<T>(value): T | undefined — value from the previous render
const prev = usePrevious(count);

// useDebounce<T>(value, delayMs = 300): T — debounced value
const debounced = useDebounce(query, 400);

// useEventListener(type, handler, target?, options?) — auto-cleanup, SSR-safe, typed
useEventListener('keydown', (e) => e.key === 'Escape' && close());
useEventListener('click', onClick, elementRef);

// useInterval(callback, delayMs | null) — null pauses; no stale-closure bugs
useInterval(() => tick(), isRunning ? 1000 : null);

// useTimeout(callback, delayMs | null) — null disables; changing delay restarts
useTimeout(() => setVisible(false), visible ? 3000 : null);

// useToggle(initial = false): [boolean, { toggle, setOn, setOff, set }]
const [isOpen, { toggle, setOff }] = useToggle();

// useCounter(initial = 0, { min?, max?, step? }): [number, { increment, decrement, set, reset }]
const [count, { increment, decrement }] = useCounter(0, { min: 0, max: 10 });
```

Full reference → [docs/reference.md](./docs/reference.md).

### Browser / DOM

> All SSR-safe: deterministic value on the server, real value after hydration.

```tsx
// useMediaQuery(query, { defaultValue? }): boolean
const isDark = useMediaQuery('(prefers-color-scheme: dark)');

// useWindowSize(): { width, height } — 0x0 on server, real size after mount
const { width } = useWindowSize();

// useClickOutside(ref, handler, { enabled?, events? }) — close menus/popovers
const ref = useRef<HTMLDivElement>(null);
useClickOutside(ref, () => setOpen(false));

// useDocumentTitle(title, { restoreOnUnmount? })
useDocumentTitle(`Inbox (${unread})`);

// useClipboard({ resetDelay? }): { copy, copied, error } — never throws
const { copy, copied } = useClipboard();
<button onClick={() => copy(url)}>{copied ? 'Copied!' : 'Copy'}</button>;

// useNetworkStatus(): { online }
const { online } = useNetworkStatus();

// useHotkey(keys, handler, { enabled?, event?, target?, preventDefault? })
//   keys: 'ctrl+s' | 'meta+k' | 'escape' | ['meta+k', 'ctrl+k']
//   only detects the press — preventDefault is true by default
useHotkey('ctrl+s', (e) => save());
useHotkey(['meta+k', 'ctrl+k'], () => openCommandPalette());

// useIdle(timeout, { events?, initialState?, onIdle?, onActive? }): boolean
//   true once the user has been inactive for `timeout` ms; resets on activity
const idle = useIdle(60_000, { onIdle: () => logout() });

// useWebSocket<T>({ url, onMessageReceived?, disableInitialConnection? })
//   -> { isConnected, error, sendData, reconnect, closeConnection }
const { isConnected, sendData } = useWebSocket<ChatMessage>({
  url: 'wss://example.com/chat',
  onMessageReceived: (e) => appendMessage(e.data),
});
sendData(JSON.stringify(msg)); // returns false (dropped) until isConnected
```

### Data fetching

```tsx
// useFetch<T>({ queryKey, queryFn, enabled?, keepPreviousData? })
//   -> { data, error, isLoading, isFetching, isError, isSuccess, refetch }
const { data, isLoading, isError, refetch } = useFetch({
  queryKey: ['user', id],
  queryFn: (signal) => fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
  enabled: id != null,
  keepPreviousData: true, // keep current page while the next loads
});

// useMutation<TData, TVars>(mutationFn, { onMutate?, onSuccess?, onError?, onSettled? })
//   -> { mutate, mutateAsync, data, error, isPending, isError, isSuccess, reset }
const { mutateAsync: createUser, isPending } = useMutation((vars: { name: string }) =>
  fetch('/api/users', { method: 'POST', body: JSON.stringify(vars) }),
);
await createUser({ name: 'Ada' }); // mutateAsync rejects on error (try/catch)

// useInvalidateQueries() -> invalidate(key | keys, { exact? })
//   refetch mounted useFetch()es by key — prefix match by default.
//   Also exported as a standalone invalidateQueries() for use outside React.
const invalidate = useInvalidateQueries();
invalidate(['user', id]); // one key (prefix): ['user', id], ['user', id, …]
invalidate([['user'], ['todos']]); // several keys at once (array of keys)
invalidate(['user', id], { exact: true }); // only the identical key

// useRetry(fn, { retries?, delay?, backoff?, onRetry?, shouldRetry? })
//   -> { run, data, error, status, attempt, isLoading, cancel, reset }
const { run, attempt, isLoading } = useRetry(
  (signal) => fetch('/api/flaky', { signal }).then((r) => r.json()),
  { retries: 4, delay: 400, backoff: 2 },
);

// usePolling(fn, { interval, enabled?, immediate?, onError? })
//   -> { data, error, isPolling, lastUpdated, start, stop, refresh }
const { data, stop } = usePolling(
  (signal) => fetch('/api/status', { signal }).then((r) => r.json()),
  { interval: 5000 },
);

// useInfiniteScroll(onLoadMore, { enabled?, rootMargin?, root?, threshold? })
//   -> { ref }  (attach to a sentinel at the end of the list)
const { ref } = useInfiniteScroll(() => loadNextPage(), {
  enabled: hasMore && !isLoading,
  rootMargin: '200px',
});
```

### UI state

```tsx
// useDisclosure<T>(initialOpen?, { onOpen?, onClose? })
//   -> { opened, data, open, close, toggle }
const dialog = useDisclosure<User>();
<button onClick={() => dialog.open(user)}>Edit</button>;
<Modal open={dialog.opened} onClose={dialog.close}>
  {dialog.data && <EditForm user={dialog.data} />}
</Modal>;

// useStep(totalSteps, { initial?, loop? })
//   -> [step, { setStep, next, back, reset, canNext, canBack, isFirst, isLast }]
const [step, { next, back, canBack, isLast }] = useStep(3);
<button onClick={back} disabled={!canBack}>
  Back
</button>;
<button onClick={next}>{isLast ? 'Finish' : 'Next'}</button>;

// useTimer({ initialTime?, interval?, autoStart?, countdown?, onEnd? })
//   -> { time, isRunning, start, pause, resume, restart }
const { time, restart } = useTimer({
  initialTime: 30_000,
  countdown: true,
  onEnd: () => setCanResend(true),
});
```

Full reference → [docs/reference.md](./docs/reference.md).

---

## When to use hook-toolkit vs. alternatives

hook-toolkit is deliberately **not** a data-fetching framework or a form framework. Reach for the right tool:

| If you need…                                                                                  | Use                                                    | Why                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A shared server **cache**, `staleTime`/`gcTime`, retries, pagination, dedup across components | **[TanStack Query](https://tanstack.com/query)** / SWR | hook-toolkit has no stored data cache. `useFetch` does offer key-based **invalidation** (`useInvalidateQueries`), and `useAsyncAction`/`useDebouncedAsync` manage _local_ component async state. |
| Complex forms: schema validation, field arrays, resolver ecosystem                            | **[react-hook-form](https://react-hook-form.com/)**    | hook-toolkit intentionally has no form engine. Pair `useAutosave`/`useUnsavedChanges` with it.                                                                                                   |
| A single built-in need already covered by React                                               | React's `useState`/`useReducer`                        | Don't add a dependency for something trivial.                                                                                                                                                    |
| Debounce, persisted state, autosave, unsaved-change guards, cancelable search                 | **hook-toolkit**                                       | These are the workflows it was built to make correct and one-line.                                                                                                                               |

For **simple** `useQuery`/`useMutation` usage (data + loading + error, plus key-based invalidation, no shared cache), `useFetch`/`useMutation`/`useInvalidateQueries` are a zero-dependency drop-in — see the [migration guide from TanStack Query](./docs/migration/from-tanstack-query.md).

hook-toolkit composes cleanly **alongside** these libraries — e.g. `useAutosave` + react-hook-form, or `useDebouncedAsync` feeding a TanStack Query key.

---

## SSR & hydration

Hooks that read browser state return a deterministic value on the server and first client paint, then update after hydration:

- `usePersistentState` → `initialValue` on the server, real stored value after hydration.
- `useMediaQuery` → `defaultValue` (default `false`).
- `useWindowSize` → `{ width: 0, height: 0 }`, then the real size in a layout effect.
- `useNetworkStatus` → `{ online: true }`, then `navigator.onLine`.

This is intentional and prevents hydration mismatches. Gate any flash-sensitive UI on a mounted flag if needed.

---

## TypeScript

hook-toolkit is written in TypeScript with strict settings and ships its own declarations — no `@types/*` package needed. Generics infer from your usage:

```tsx
// T inferred as { id: string; name: string }
const [user, setUser] = usePersistentState('user', { id: '', name: '' });

// run() args are typed from fn's signature after the signal
const del = useAsyncAction((signal, id: string) => api.remove(id, signal));
del.run('abc'); // ✅  del.run(123) ❌ type error

// data typed as City[] from the fetcher's return
const { data } = useDebouncedAsync<City[], string>(query, searchCities);
```

All public option/return types are exported (e.g. `UseAsyncAction`, `SaveStatus`, `PersistentStateOptions`) for annotating wrappers.

---

## Compatibility & browser support

|                                       | Requirement                                                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **React**                             | 18.0+ (peer dependency; uses `useSyncExternalStore`)                                                                                                                                       |
| **Module formats**                    | ESM (`import`) and CommonJS (`require`)                                                                                                                                                    |
| **Node (for consumers' build tools)** | 18+                                                                                                                                                                                        |
| **Browsers**                          | All evergreen browsers (Chrome, Firefox, Safari, Edge). `useClipboard` needs a secure context (HTTPS/localhost); `useAsyncAction`/`useDebouncedAsync`/`useAutosave` use `AbortController`. |
| **SSR**                               | Next.js, Remix, etc. — browser hooks are server-safe (see [SSR & hydration](#ssr--hydration)).                                                                                             |

Not tested against React 16/17 (they lack a built-in `useSyncExternalStore`). React 19 support is on the [roadmap](./ROADMAP.md).

---

## Local development

```bash
git clone https://github.com/rajkumar4041/react-hooks.git
cd react-hooks
npm install

npm test             # run tests once
npm run test:watch   # watch mode
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # ESLint, 0 warnings allowed
npm run format       # Prettier write
npm run build        # ESM + CJS + .d.ts into dist/
npm run check        # typecheck + lint + test + build (full gate, same as CI)
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the bar every hook must meet and [RELEASE.md](./RELEASE.md) for the versioning/publish process.

---

## FAQ & troubleshooting

**Is there a global cache like React Query?** No stored data cache — by design. `useFetch` does support key-based **invalidation** across components (`useInvalidateQueries` / `invalidateQueries`), which refetches mounted queries by key. For a shared server cache, dedup, and `staleTime`, use TanStack Query (they compose well together).

**My `usePersistentState` value flashes the default on first render.** Expected under SSR: the server can't read browser storage, so the value is `initialValue` until hydration completes, then it updates. Gate flash-sensitive UI on a mounted flag.

**Cancellation doesn't actually stop my request.** You must forward the provided `AbortSignal` to `fetch(url, { signal })` (or your HTTP client). Without it, hook-toolkit still prevents stale state updates, but the network request keeps running.

**`beforeunload` shows a generic message, not mine.** Browsers ignore custom `beforeunload` text for security. Use `confirmNavigation` for in-app prompts where you control the text.

**Does it work with Strict Mode?** Yes. Effects are written to tolerate React 18's double-invocation in development.

**`useClipboard` fails silently.** The async Clipboard API requires a secure context (HTTPS or `localhost`) and sometimes a user gesture. `copy` resolves `false` and populates `error` in that case — it never throws.

---

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md). Security reports: [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © Rajkumar Rathod
