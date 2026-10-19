# Reference: primitives & browser hooks

Concise reference for the supporting hooks. All are importable from `hook-toolkit` and documented in source via JSDoc.

```ts
import { useLatest /* …any hook… */ } from 'hook-toolkit';
```

---

## Primitives

### `useLatest<T>(value): { current: T }`

A ref whose `.current` always holds the most recent value, updated during render. Read the latest value inside timers/listeners/async without stale closures or extra dependencies.

```tsx
const latest = useLatest(onChange);
useEffect(() => {
  const id = setInterval(() => latest.current(), 1000);
  return () => clearInterval(id);
}, []);
```

### `useIsMounted(): () => boolean`

Stable function reporting whether the component is still mounted. Guard `setState` after an `await`.

```tsx
const isMounted = useIsMounted();
const data = await load();
if (isMounted()) setData(data);
```

### `usePrevious<T>(value): T | undefined`

The value from the previous render (`undefined` on first render).

```tsx
const prev = usePrevious(count); // compare current vs previous
```

### `useDebounce<T>(value, delayMs = 300): T`

A debounced copy of `value` that updates only after changes settle.

```tsx
const debounced = useDebounce(query, 400);
useEffect(() => {
  if (debounced) search(debounced);
}, [debounced]);
```

### `useEventListener(type, handler, target?, options?)`

Add a DOM event listener with automatic cleanup and no stale closures. Typed overloads for `window` (default), `document`, element refs, and `MediaQueryList`. SSR-safe.

```tsx
useEventListener('keydown', (e) => e.key === 'Escape' && close());

const ref = useRef<HTMLDivElement>(null);
useEventListener('click', onClick, ref);
```

### `useInterval(callback, delayMs | null)`

Run `callback` on an interval without stale-closure bugs. Pass `null` to pause. Changing the callback does not reset the timer.

```tsx
useInterval(() => tick(), isRunning ? 1000 : null);
```

### `useTimeout(callback, delayMs | null)`

Run `callback` once after a delay, with cleanup. `null` disables; changing the delay restarts it.

```tsx
useTimeout(() => setVisible(false), visible ? 3000 : null);
```

### `useToggle(initial = false): [boolean, { toggle, setOn, setOff, set }]`

Boolean state with stable controls.

```tsx
const [isOpen, { toggle, setOff }] = useToggle();
```

### `useCounter(initial = 0, { min?, max?, step? }): [number, { increment, decrement, set, reset }]`

Numeric counter with optional clamping and a configurable step. The initial value is clamped into range.

```tsx
const [count, { increment, decrement }] = useCounter(0, { min: 0, max: 10 });
```

---

## Browser / DOM

> All browser hooks are SSR-safe: they return a deterministic value on the server/first paint and update after hydration.

### `useMediaQuery(query, { defaultValue? }): boolean`

Match a CSS media query reactively. `defaultValue` (default `false`) is used during SSR/first paint.

```tsx
const isDark = useMediaQuery('(prefers-color-scheme: dark)');
```

### `useWindowSize(): { width, height }`

Viewport dimensions, updated on resize. Starts at `{ width: 0, height: 0 }` on the server, then reads the real size in a layout effect.

```tsx
const { width } = useWindowSize();
```

### `useClickOutside(ref, handler, { enabled?, events? })`

Call `handler` on a pointer/touch interaction outside the referenced element. Listens on `mousedown` + `touchstart` by default.

```tsx
const ref = useRef<HTMLDivElement>(null);
useClickOutside(ref, () => setOpen(false));
```

### `useDocumentTitle(title, { restoreOnUnmount? })`

Set `document.title`; optionally restore the previous title on unmount.

```tsx
useDocumentTitle(`Inbox (${unread})`);
```

### `useClipboard({ resetDelay? }): { copy, copied, error }`

Copy text via the async Clipboard API with success feedback. `copy` resolves `true`/`false` and never throws. Requires a secure context (HTTPS/localhost).

```tsx
const { copy, copied } = useClipboard();
<button onClick={() => copy(url)}>{copied ? 'Copied!' : 'Copy'}</button>;
```

### `useNetworkStatus(): { online }`

Track online/offline status. Assumes `online: true` on the server; reflects `navigator.onLine` after hydration. Note: reports device connectivity, not whether your API is reachable.

```tsx
const { online } = useNetworkStatus();
```
