import { useEffect, type RefObject } from 'react';
import { useLatest } from './useLatest';
import { isBrowser } from '../utils/isBrowser';

export interface UseHotkeyOptions {
  /** Disable the listener without unmounting. Defaults to `true`. */
  enabled?: boolean;
  /** Keyboard event to listen for. Defaults to `'keydown'`. */
  event?: 'keydown' | 'keyup';
  /**
   * Where to attach the listener. A `window`, `document`, or an element ref.
   * Defaults to `window`.
   */
  target?: Window | Document | RefObject<HTMLElement | null> | null;
  /** Call `event.preventDefault()` when a hotkey matches. Defaults to `true`. */
  preventDefault?: boolean;
}

/** Modifier aliases → the matching `KeyboardEvent` boolean flag. */
const MODIFIERS: Record<string, 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'> = {
  ctrl: 'ctrlKey',
  control: 'ctrlKey',
  meta: 'metaKey',
  cmd: 'metaKey',
  command: 'metaKey',
  win: 'metaKey',
  alt: 'altKey',
  option: 'altKey',
  shift: 'shiftKey',
};

interface ParsedHotkey {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/** Turn `"ctrl+shift+k"` into the flags + key we compare against an event. */
function parse(combo: string): ParsedHotkey {
  const parsed: ParsedHotkey = {
    key: '',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
  };
  for (const raw of combo.split('+')) {
    const part = raw.trim().toLowerCase();
    if (!part) continue;
    const modifier = MODIFIERS[part];
    if (modifier) parsed[modifier] = true;
    else parsed.key = part;
  }
  return parsed;
}

/** Does this keyboard event satisfy the parsed combo? */
function matches(event: KeyboardEvent, combo: ParsedHotkey): boolean {
  if (event.ctrlKey !== combo.ctrlKey) return false;
  if (event.metaKey !== combo.metaKey) return false;
  if (event.altKey !== combo.altKey) return false;
  if (event.shiftKey !== combo.shiftKey) return false;
  // Match by `key` ("a", "enter", "escape", "arrowup") or by `code` ("keya").
  const key = event.key.toLowerCase();
  const code = event.code.toLowerCase();
  return combo.key === key || combo.key === code;
}

/**
 * Fires `handler` when a key or key-combo is pressed. The hook only *detects*
 * the press — what happens next is entirely up to your handler.
 *
 * Combos are plain strings joined by `+`: `"s"`, `"ctrl+s"`, `"meta+k"`,
 * `"ctrl+shift+p"`, `"escape"`, `"arrowup"`. Modifier aliases are flexible
 * (`ctrl`/`control`, `meta`/`cmd`/`command`/`win`, `alt`/`option`, `shift`).
 * Pass an array to bind several combos to the same handler.
 *
 * The handler always sees current props/state (no stale closures) and isn't an
 * effect dependency, so the listener binds once. SSR-safe: does nothing without
 * a DOM.
 *
 * @example
 * ```tsx
 * useHotkey('ctrl+s', (e) => save());
 * useHotkey('escape', () => close());
 * useHotkey(['meta+k', 'ctrl+k'], () => openCommandPalette());
 * ```
 *
 * @param keys    A combo string, or an array of combo strings.
 * @param handler Called with the matching `KeyboardEvent`.
 * @param options `enabled`, `event`, `target`, `preventDefault`.
 */
export function useHotkey(
  keys: string | string[],
  handler: (event: KeyboardEvent) => void,
  options: UseHotkeyOptions = {},
): void {
  const { enabled = true, event = 'keydown', target, preventDefault = true } = options;
  const handlerRef = useLatest(handler);
  // Stable string key so changing the array literal each render does not re-bind.
  const combosKey = (Array.isArray(keys) ? keys : [keys]).join('\0');

  useEffect(() => {
    if (!isBrowser || !enabled) return;

    const resolved: EventTarget | null | undefined =
      target && 'current' in target ? target.current : (target ?? window);
    if (!resolved || typeof resolved.addEventListener !== 'function') return;

    const combos = combosKey.split('\0').map(parse);

    const listener = (e: Event) => {
      const keyboardEvent = e as KeyboardEvent;
      if (!combos.some((combo) => matches(keyboardEvent, combo))) return;
      if (preventDefault) keyboardEvent.preventDefault();
      handlerRef.current(keyboardEvent);
    };

    resolved.addEventListener(event, listener);
    return () => resolved.removeEventListener(event, listener);
  }, [enabled, event, target, preventDefault, combosKey, handlerRef]);
}
