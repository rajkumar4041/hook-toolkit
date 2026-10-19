import { useEffect, useLayoutEffect } from 'react';
import { isBrowser } from './isBrowser';

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * React warns when `useLayoutEffect` runs during SSR because layout effects
 * cannot run on the server. This picks the correct hook so DOM-measuring hooks
 * work client-side without emitting that warning during server rendering.
 */
export const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect;
