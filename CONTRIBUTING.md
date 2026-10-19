# Contributing to react-hookflow

Thanks for your interest in improving react-hookflow! This project values **quality over quantity** — a small set of hooks that are correct, well-typed, well-tested, and well-documented.

## Philosophy: what belongs in react-hookflow

Before proposing a new hook, ask:

1. **Does it eliminate a real, recurring workflow** — or is it a thin wrapper over one `useState`/`useEffect`? We prefer the former.
2. **Is it meaningfully better than an existing, well-established library?** If TanStack Query / react-hook-form already solve it excellently, we document that instead of competing.
3. **Can it be implemented with zero runtime dependencies?** react-hookflow ships no runtime deps.

We would rather reject a mediocre hook than inflate the hook count.

## Development setup

```bash
git clone https://github.com/rajkumar4041/react-hooks.git
cd react-hooks
npm install
```

Common scripts:

| Command                 | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `npm test`              | Run the test suite once                         |
| `npm run test:watch`    | Watch mode                                      |
| `npm run test:coverage` | Coverage report                                 |
| `npm run typecheck`     | `tsc --noEmit` (strict)                         |
| `npm run lint`          | ESLint (0 warnings allowed)                     |
| `npm run format`        | Prettier write                                  |
| `npm run build`         | Build ESM + CJS + `.d.ts`                       |
| `npm run check`         | typecheck + lint + test + build (the full gate) |

Run `npm run check` before opening a PR; CI runs the same on Node 18, 20, and 22.

## Standards every hook must meet

- Follows the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).
- Cleans up every timer, listener, subscription, observer, and in-flight request.
- No stale closures (use `useLatest` for values read inside async/timer callbacks).
- SSR-safe: never touch `window`/`document` during render; guard with the `isBrowser` util.
- Strict-Mode safe (double-invoked effects must not break it).
- No hydration mismatch for browser/persisted state.
- No `any`. No `// @ts-ignore` to silence real errors. Generics where appropriate.
- Co-located tests covering: normal use, updates, invalid input/boundaries, cleanup on unmount, timers (fake timers), and async success/error/cancellation/overlap where relevant.
- A JSDoc block with a minimal example, and a doc page under `docs/`.

## Adding a hook (checklist)

1. `src/hooks/useThing.ts` with a full JSDoc block.
2. `src/hooks/useThing.test.ts(x)` with meaningful cases (not just the happy path).
3. Export it (and its public types) from `src/index.ts`.
4. Add a doc page: `docs/hooks/useThing.md` (or a section in `docs/reference.md` for primitives).
5. Link it in the README hook directory.
6. Add a `CHANGELOG.md` entry under **Unreleased**.
7. `npm run check` is green.

## Commit & PR conventions

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
- Branch names use the same prefixes, e.g. `feat/use-thing`, `fix/autosave-abort`.
- Keep PRs focused. A new hook, its tests, and its docs can land together.

## Versioning

react-hookflow follows [Semantic Versioning](https://semver.org/). See [RELEASE.md](./RELEASE.md) for the deprecation and release policy.

By contributing you agree your contributions are licensed under the [MIT License](./LICENSE).
