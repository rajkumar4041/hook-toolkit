# Security Policy

## Supported Versions

hookflow is pre-1.0. During `0.x`, security fixes are applied to the latest published minor version.

| Version      | Supported |
| ------------ | --------- |
| latest `0.x` | ✅        |
| older `0.x`  | ❌        |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report privately using GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability):

1. Go to the repository's **Security** tab → **Report a vulnerability**.
2. Describe the issue, affected versions, and reproduction steps.

If private reporting is unavailable, contact the maintainer directly via the email on their GitHub profile.

### What to expect

- Acknowledgement within a few days.
- An assessment and, if confirmed, a fix and coordinated release.
- Credit in the release notes if you would like it.

## Scope notes

hookflow ships **no runtime dependencies** and runs entirely in the client. The most relevant risks are:

- **`usePersistentState`** stores data in `localStorage`/`sessionStorage` in plain text. Never persist secrets or tokens with it.
- Hooks do not perform network requests themselves; the functions you pass to `useAsyncAction` / `useDebouncedAsync` / `useAutosave` are responsible for safe request handling.
