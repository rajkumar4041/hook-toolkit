# hook-toolkit

> Production-ready React hooks that eliminate entire repetitive **workflows** — not just another grab-bag of primitives.

[![CI](https://github.com/rajkumar4041/react-hooks/actions/workflows/ci.yml/badge.svg)](https://github.com/rajkumar4041/react-hooks/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/hook-toolkit.svg)](https://www.npmjs.com/package/hook-toolkit)
[![types](https://img.shields.io/npm/types/hook-toolkit.svg)](https://www.npmjs.com/package/hook-toolkit)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/hook-toolkit.svg)](https://bundlephobia.com/package/hook-toolkit)

> **Status:** pre-release (`0.1.0`). Badges that depend on the npm registry activate once the package is published.

`hook-toolkit` is a lightweight, TypeScript-first collection of React hooks. Its five flagship hooks are the differentiator: they compose the **hard, bug-prone parts** that other libraries leave to you — request cancellation, stale-result races, cross-tab sync, save-status machines, and unsaved-change guards — behind a one-line API.

- **Zero runtime dependencies.** React is the only peer dependency.
- **TypeScript-first.** Full generics and inference; no `any` in the codebase.
- **SSR-safe & Strict-Mode safe.** Browser hooks never touch `window`/`document` during server render and avoid hydration mismatches.
- **Tree-shakeable.** ESM + CJS builds, `sideEffects: false`.
- **Tested.** 98 tests covering async/cancellation/stale-results, SSR, timers, and cleanup.

---

## Installation

```bash
npm install hook-toolkit
# or: pnpm add hook-toolkit / yarn add hook-toolkit
```

**Requirements:** React **18+** (uses `useSyncExternalStore`), Node **18+** for development. Works in all evergreen browsers.

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

### 🚩 Flagship workflow hooks

| Hook                                                       | What it eliminates                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`usePersistentState`](./docs/hooks/usePersistentState.md) | localStorage/sessionStorage + cross-tab sync + SSR/hydration safety      |
| [`useAsyncAction`](./docs/hooks/useAsyncAction.md)         | loading/error state + double-submit guard + cancellation + stale results |
| [`useDebouncedAsync`](./docs/hooks/useDebouncedAsync.md)   | debounce + cancellation + stale-result protection (search/autocomplete)  |
| [`useAutosave`](./docs/hooks/useAutosave.md)               | debounced save + status machine + failure handling                       |
| [`useUnsavedChanges`](./docs/hooks/useUnsavedChanges.md)   | `beforeunload` guard + router navigation confirmation                    |

### 🔧 Primitives

`useLatest` · `useIsMounted` · `usePrevious` · `useDebounce` · `useEventListener` · `useInterval` · `useTimeout` · `useToggle` · `useCounter`

### 🌐 Browser / DOM

`useMediaQuery` · `useWindowSize` · `useClickOutside` · `useDocumentTitle` · `useClipboard` · `useNetworkStatus`

See [`docs/`](./docs/README.md) for the full reference with examples, options, return values, and limitations for every hook.

---

## When to use hook-toolkit vs. alternatives

hook-toolkit is deliberately **not** a data-fetching framework or a form framework. Reach for the right tool:

| If you need…                                                                   | Use                                                    | Why                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Server cache, query invalidation, retries, pagination, dedup across components | **[TanStack Query](https://tanstack.com/query)** / SWR | hook-toolkit has no global cache. `useAsyncAction`/`useDebouncedAsync` manage _local_ component async state only. |
| Complex forms: schema validation, field arrays, resolver ecosystem             | **[react-hook-form](https://react-hook-form.com/)**    | hook-toolkit intentionally has no form engine. Pair `useAutosave`/`useUnsavedChanges` with it.                    |
| A single built-in need already covered by React                                | React's `useState`/`useReducer`                        | Don't add a dependency for something trivial.                                                                 |
| Debounce, persisted state, autosave, unsaved-change guards, cancelable search  | **hook-toolkit**                                           | These are the workflows it was built to make correct and one-line.                                            |

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

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md). Security reports: [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © Rajkumar Rathod
