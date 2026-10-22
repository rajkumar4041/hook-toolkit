<!--
Thanks for contributing to hook-toolkit! Please fill this out so reviews stay fast.
Keep PRs focused — a new hook, its tests, and its docs can land together.
-->

## Summary

<!-- What does this PR do, and why? Link any related issue: Closes #123 -->

## Type of change

- [ ] 🐛 Bug fix (non-breaking)
- [ ] ✨ New hook / feature (non-breaking)
- [ ] 💥 Breaking change (changes a public API)
- [ ] 📝 Docs only
- [ ] 🧹 Refactor / chore (no API change)

## Checklist

- [ ] `npm run check` passes locally (typecheck + lint + test + build)
- [ ] Tests added/updated — not just the happy path (invalid input, cleanup on unmount, timers, async success/error/cancellation where relevant)
- [ ] No `any` and no `@ts-ignore`/`eslint-disable` that hides a real problem
- [ ] Timers, listeners, subscriptions, observers, and in-flight requests are cleaned up
- [ ] SSR-safe (no `window`/`document` access during render) and Strict-Mode safe, where applicable
- [ ] Public types exported from `src/index.ts`
- [ ] Docs updated (README directory + inline reference and/or `docs/`)
- [ ] `CHANGELOG.md` updated under **Unreleased**

## For a new hook

- [ ] It eliminates a real, recurring workflow (not a thin wrapper over one `useState`/`useEffect`)
- [ ] It's meaningfully better than existing alternatives, or composes with them (see [CONTRIBUTING](../CONTRIBUTING.md))

## Screenshots / notes

<!-- Optional: demo, before/after, or anything reviewers should know. -->
