# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.1] - 2026-10-27

### Changed

- Documentation updates and consistent Prettier formatting across the repo.

## [0.3.0] - 2026-10-27

### Added

- `useStep(totalSteps, options?)` — 1-based step state for wizards, onboarding, and multi-step forms. Returns `[step, controls]` with `setStep`/`next`/`back`/`reset` (all clamped) plus `canNext`/`canBack`/`isFirst`/`isLast`; `loop` wraps around the ends.
- `useIdle(timeout, options?)` — report `true` once the user has been inactive for `timeout` ms. Watches pointer/keyboard/scroll/touch activity (configurable), resets on any activity, fires `onIdle`/`onActive`, SSR-safe.
- `useTimer(options?)` — stopwatch (counts up) or countdown timer with `start`/`pause`/`resume`/`restart`, `time`/`isRunning`, configurable `interval`, `autoStart`, and an `onEnd` callback fired once when a countdown hits 0.
- `useHotkey(keys, handler, options?)` — fire a handler on a key or key-combo press. Combos are plain `+`-joined strings (`'ctrl+s'`, `'meta+k'`, `'escape'`, `'ctrl+shift+p'`) with flexible modifier aliases (`ctrl`/`control`, `meta`/`cmd`/`command`/`win`, `alt`/`option`, `shift`); pass an array to bind several combos to one handler. Matches by `key` or `code`, `preventDefault` on by default, `enabled`/`event`/`target` options, SSR-safe, no stale closures.
- `useInvalidateQueries()` — returns a stable `invalidate(key | keys, { exact? })` that refetches every mounted `useFetch` whose `queryKey` matches, the TanStack-Query `queryClient.invalidateQueries` pattern without a provider or a stored cache. Prefix match by default; `{ exact: true }` for an identical match; pass an array of keys (`[['todos'], ['users']]`) to invalidate several at once (each query refetches at most once).
- `invalidateQueries(key | keys, options?)` — the same thing as a standalone function for use outside React (e.g. store actions, event handlers).

## [0.2.2] - 2026-10-22

### Added

TanStack-Query-lite data hooks (typed, loading + error, zero-dependency — no cache/dedup/retries):

- `useFetch<T>` — declarative query via `queryKey` + `queryFn(signal)`, with `enabled`, `keepPreviousData`, `refetch`, abort-on-key-change, and stale-result protection.
- `useMutation<TData, TVars>` — `mutate` (fire-and-forget) + `mutateAsync` (awaitable, rejects on error), `isPending`/`error`/`data`/`reset`, and `onMutate`/`onSuccess`/`onError`/`onSettled` callbacks.

Intended as a lightweight replacement for simple `@tanstack/react-query` `useQuery`/`useMutation` usage.

## [0.2.1] - 2026-10-22

### Added

Data-fetching / resilience hooks (zero-dependency, SSR-safe, tested):

- `useRetry` — retry an async action with configurable attempts and exponential backoff; `run`/`cancel`/`reset`, `attempt` count, abortable backoff.
- `usePolling` — poll an async function on an interval with no overlap (schedule-after-settle), `start`/`stop`/`refresh`, abort on stop/unmount.
- `useInfiniteScroll` — `IntersectionObserver`-based sentinel that calls `onLoadMore` when scrolled into view.

## [0.2.0] - 2026-10-19

### Added

- `useDisclosure<T>` — open/close state for modals/drawers/dialogs with an optional typed data payload and stable controls (`opened`, `data`, `open`, `close`, `toggle`).
- `useWebSocket<T>` — WebSocket connection manager with `isConnected`/`error` state, typed `onMessageReceived` (no stale closures), `sendData`, `reconnect`, `closeConnection`, SSR-safe, auto-cleanup.
- Documentation site: <https://hook-toolkit-document-8azd.vercel.app/>.

### Changed

- `package.json` `homepage` now points to the documentation site.

## [0.1.0] - 2026-10-19

Initial pre-release. 20 hooks, zero runtime dependencies, React 18+.

### Added

**Flagship workflow hooks**

- `usePersistentState` — `useState` persisted to localStorage/sessionStorage with cross-tab sync and SSR/hydration safety.
- `useAsyncAction` — async state (loading/success/error) with a double-submit guard, `AbortSignal` cancellation, and stale-result protection; `run()` never rejects.
- `useDebouncedAsync` — debounce + cancellation + stale-result protection for search/autocomplete.
- `useAutosave` — debounced save with an idle/saving/saved/error status machine, dirty tracking, and failure handling.
- `useUnsavedChanges` — `beforeunload` guard plus `confirmNavigation()` for client-side router guards.

**Primitives**

- `useLatest`, `useIsMounted`, `usePrevious`, `useDebounce`, `useEventListener`, `useInterval`, `useTimeout`, `useToggle`, `useCounter`.

**Browser / DOM**

- `useMediaQuery`, `useWindowSize`, `useClickOutside`, `useDocumentTitle`, `useClipboard`, `useNetworkStatus`.

### Tooling

- tsup build (ESM + CJS + `.d.ts`), strict TypeScript, `sideEffects: false`.
- Vitest + React Testing Library + jsdom (98 tests).
- ESLint (rules-of-hooks, no `any`) + Prettier.
- GitHub Actions CI on Node 18/20/22; release workflow with npm provenance.

[Unreleased]: https://github.com/rajkumar4041/react-hooks/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/rajkumar4041/react-hooks/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/rajkumar4041/react-hooks/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/rajkumar4041/react-hooks/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/rajkumar4041/react-hooks/releases/tag/v0.1.0
