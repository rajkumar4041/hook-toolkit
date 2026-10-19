# Pre-Release Validation Checklist

Run through this before the first publish (and before each major release).

## Code quality

- [ ] `npm run typecheck` passes (strict mode, no errors).
- [ ] `npm run lint` passes with **0 warnings**.
- [ ] `npm run format:check` passes.
- [ ] `npm test` — all tests green.
- [ ] `npm run test:coverage` reviewed; every exported hook has meaningful tests (not just happy path).
- [ ] No `any` and no `@ts-ignore`/`eslint-disable` that hides a real problem.

## Behavior

- [ ] Every browser hook is SSR-safe (no `window`/`document` access during render).
- [ ] Persisted/browser hooks do not cause hydration mismatches.
- [ ] Hooks verified under React **Strict Mode** (double-invoked effects).
- [ ] Timers, listeners, observers, and in-flight requests are cleaned up on unmount.
- [ ] Async hooks: success, error, cancellation, and overlapping-call behavior all verified.

## Package

- [ ] `npm run build` produces `dist/index.js` (ESM), `dist/index.cjs` (CJS), and `dist/index.d.ts`.
- [ ] `node -e "require('./dist/index.cjs')"` and an ESM import both resolve all hooks.
- [ ] `npm pack --dry-run` publishes **only** `dist/`, `README.md`, `LICENSE`, `package.json`.
- [ ] `package.json`: correct `name`, `version`, `main`, `module`, `types`, `exports`, `sideEffects: false`, `files`.
- [ ] `react` is a **peer** dependency (not a dependency); the peer range matches the APIs used (React 18+).
- [ ] `engines.node` and browser support are documented.
- [ ] `publint` / `@arethetypeswrong/cli` reviewed (optional but recommended) for exports-map correctness.

## Docs & metadata

- [ ] README install, examples, and badges are accurate (no fabricated stats).
- [ ] Every hook has a doc page / reference entry with example, options, returns, limitations.
- [ ] `CHANGELOG.md` updated for this version.
- [ ] `LICENSE` present and year/author correct.
- [ ] Repository URL, bugs URL, homepage correct in `package.json`.

## Publish

- [ ] npm package name is available / owned (`npm view react-hookflow`).
- [ ] `NPM_TOKEN` secret configured for the Release workflow (automated path).
- [ ] Version bumped and tagged (`npm version ...`).
- [ ] GitHub Release created → Release workflow publishes with provenance.
- [ ] Post-publish: `npm view react-hookflow` shows the new version; a fresh `npm install react-hookflow` in a scratch project works.
