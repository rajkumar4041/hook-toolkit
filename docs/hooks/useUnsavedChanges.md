# useUnsavedChanges

## What problem does it solve?

When a form has unsaved edits, you want to warn the user before they lose them — on page reload/close/back, and on in-app route changes. `useUnsavedChanges` wires the `beforeunload` guard and gives you a helper for client-side router guards.

## Import

```ts
import { useUnsavedChanges } from 'hookflow';
```

## Minimal example

```tsx
useUnsavedChanges(form.isDirty);
// That's it — reloading/closing the tab now prompts while dirty.
```

## Real-world example

```tsx
function EditPage() {
  const { isDirty } = useForm();
  const { confirmNavigation } = useUnsavedChanges(isDirty);
  const navigate = useNavigate();

  const goBack = () => {
    if (confirmNavigation()) navigate(-1);
  };

  return <button onClick={goBack}>Back</button>;
}
```

With React Router's `useBlocker`:

```tsx
const { confirmNavigation } = useUnsavedChanges(isDirty);
useBlocker(() => !confirmNavigation());
```

## API & options

```ts
useUnsavedChanges(
  when: boolean,
  options?: {
    enabled?: boolean; // default true
    message?: string;  // used by confirmNavigation; ignored by the native dialog
  },
): { confirmNavigation: () => boolean }
```

- `when` — whether there are unsaved changes to guard.
- `enabled` — turn the guard off without changing call sites.

## Return values

- `confirmNavigation(): boolean` — returns `true` if it's safe to navigate (not dirty). Otherwise shows a `window.confirm` dialog and returns its result. Use it to gate SPA navigation.

## Edge cases & limitations

- **Native dialog text is browser-controlled.** Chrome, Firefox, and Safari ignore custom `message` for the `beforeunload` prompt and show their own generic text. `message` is still used by `confirmNavigation`.
- **`beforeunload` does not fire for SPA client-side navigation.** Use `confirmNavigation` with your router's blocking API (e.g. React Router `useBlocker`, Next.js route events).
- **Mobile browsers** may not show a `beforeunload` prompt at all.
- **SSR-safe:** no listener is attached without a DOM.

## Tests & browser support

Covered by `useUnsavedChanges.test.ts`: not blocking when clean, blocking when dirty, un-blocking after save, `enabled: false`, listener cleanup on unmount, and `confirmNavigation` behavior (no prompt when clean, prompt + result when dirty). Works in all evergreen browsers; React 18+.
