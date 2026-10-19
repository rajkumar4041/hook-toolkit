# Versioning, Deprecation & Release Policy

## Semantic Versioning

react-hookflow follows [SemVer](https://semver.org/):

- **MAJOR** — breaking changes to a hook's public API (removed hook, changed parameter order, changed return shape, narrowed types that break consumers).
- **MINOR** — new hooks, new optional options, additive type widening — all backward compatible.
- **PATCH** — bug fixes and docs that don't change the API.

During `0.x`, the API is still stabilizing: minor-version bumps **may** contain breaking changes, which will always be called out in the changelog and release notes. 1.0.0 marks the first API-stability commitment.

## Deprecation policy

When an API must change:

1. The old API is marked `@deprecated` in JSDoc with a pointer to the replacement, and keeps working.
2. A migration note is added to the changelog and a `docs/migration/` entry if non-trivial.
3. The deprecated API is removed no earlier than the **next major** version (post-1.0).

## Release process

Releases are automated via the `Release` GitHub Action, triggered by publishing a GitHub Release.

1. Ensure `main` is green and run the full local gate:
   ```bash
   npm run check
   ```
2. Update `CHANGELOG.md`: move items from **Unreleased** into a new version section with today's date.
3. Bump the version (creates a commit + tag):
   ```bash
   npm version <patch|minor|major>
   git push --follow-tags
   ```
4. Create a **GitHub Release** for the new tag with the changelog section as notes.
5. The `Release` workflow runs `prepublishOnly` (typecheck + lint + test + build) and publishes to npm with provenance.

### Manual publish (fallback)

```bash
npm run check      # full gate
npm publish --access public
```

Requires `NPM_TOKEN` (automation token) as a repository secret for the automated path, or `npm login` for the manual path.
