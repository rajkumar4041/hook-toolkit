/**
 * True when running in an environment with a DOM (browser, jsdom), false during
 * server-side rendering. Used by browser-dependent hooks to stay SSR-safe.
 */
export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
