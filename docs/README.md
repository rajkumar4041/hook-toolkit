# hook-toolkit documentation

Full reference for every hook. Each flagship page follows the same template:

1. **What problem does it solve?**
2. **Import**
3. **Minimal example**
4. **Real-world example**
5. **API & options**
6. **Return values**
7. **Edge cases & limitations**
8. **Tests & browser support**

## Flagship workflow hooks

- [usePersistentState](./hooks/usePersistentState.md) — persisted + cross-tab + SSR-safe state
- [useAsyncAction](./hooks/useAsyncAction.md) — async state, double-submit guard, cancellation
- [useDebouncedAsync](./hooks/useDebouncedAsync.md) — debounced, cancelable search/autocomplete
- [useAutosave](./hooks/useAutosave.md) — debounced save with a status machine
- [useUnsavedChanges](./hooks/useUnsavedChanges.md) — unload + router navigation guard

## Primitives & browser hooks

- [Reference](./reference.md) — primitives (`useLatest`, `useIsMounted`, `usePrevious`, `useDebounce`, `useEventListener`, `useInterval`, `useTimeout`, `useToggle`, `useCounter`), browser/DOM (`useMediaQuery`, `useWindowSize`, `useClickOutside`, `useDocumentTitle`, `useClipboard`, `useNetworkStatus`, `useWebSocket`, `useEventSource`, `useHotkey`, `useIdle`), data fetching (`useFetch`, `useMutation`, `useInvalidateQueries`, `useRetry`, `usePolling`, `useInfiniteScroll`), and UI state (`useDisclosure`, `useStep`, `useTimer`)

## Guides

- [Migrating from `@tanstack/react-query`](./migration/from-tanstack-query.md) — swap simple `useQuery`/`useMutation` for `useFetch`/`useMutation`, with before/after examples.

## Conventions

- **Options are always a trailing object** with sensible defaults — basic usage never requires it.
- **Async functions receive an `AbortSignal` first** (`(signal, ...args)` / `(value, signal)`), so cancellation is always available but never mandatory.
- **Browser hooks return a deterministic SSR value** and update after hydration.
- **Returned callbacks/controls are referentially stable** unless documented otherwise.
