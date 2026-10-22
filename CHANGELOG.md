# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

Data-fetching / resilience hooks (zero-dependency, SSR-safe, tested):

- `useRetry` — retry an async action with configurable attempts and exponential backoff; `run`/`cancel`/`reset`, `attempt` count, abortable backoff.
- `usePolling` — poll an async function on an interval with no overlap (schedule-after-settle), `start`/`stop`/`refresh`, abort on stop/unmount.
- `useInfiniteScroll` — `IntersectionObserver`-based sentinel that calls `onLoadMore` when scrolled into view.

> Note: developed on a branch off `0.2.0` in parallel with the `0.3.0` hooks; the released version number will be assigned at merge.

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

[Unreleased]: https://github.com/rajkumar4041/react-hooks/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/rajkumar4041/react-hooks/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/rajkumar4041/react-hooks/releases/tag/v0.1.0
