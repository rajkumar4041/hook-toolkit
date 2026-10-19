# Roadmap

Priorities are driven by real developer pain and maintenance cost, not hook count. This is a direction, not a promise; it will adjust based on user feedback (GitHub issues/discussions).

## v0.1 — MVP (done)

The five flagship workflow hooks + audited primitives + browser hooks. 20 hooks, zero runtime deps, React 18+. See [CHANGELOG](./CHANGELOG.md).

## v0.2 — Hardening & proof

- [ ] Documentation site (e.g. Astro Starlight / VitePress) with a searchable hook directory and live examples.
- [ ] Verify against **React 19** and add it to the CI matrix / peer range if clean.
- [ ] SSR smoke tests in a real Next.js app (App Router) — persisted + media + window hooks.
- [ ] `publint` + `@arethetypeswrong/cli` in CI to guard the exports map.
- [ ] Coverage thresholds enforced in CI.

## v0.3 — Candidate additions (only if they clear the "eliminates a workflow" bar)

- [ ] `useOptimisticAction` — optimistic UI with automatic rollback on failure (pairs with `useAsyncAction`).
- [ ] `useRetry` — retry with configurable attempts/backoff, composable into the async hooks.
- [ ] `usePolling` — interval-driven refetch with cancellation and visibility awareness.
- [ ] `useInfiniteScroll` — `IntersectionObserver`-based "load more" with a sentinel ref.
- [ ] `useFocusTrap` + `useLockBodyScroll` — accessible modal/drawer building blocks.

Each candidate must ship with: a before/after boilerplate comparison, full tests, SSR safety, and docs — or it doesn't ship.

## Explicit non-goals

- A global data-fetching cache (use TanStack Query / SWR).
- A form engine with schema validation (use react-hook-form).
- Dozens of one-line wrappers added purely to grow the count.

## 1.0

- API-stability commitment.
- Documentation site complete.
- Validated on React 18 and 19 across the latest evergreen browsers.
