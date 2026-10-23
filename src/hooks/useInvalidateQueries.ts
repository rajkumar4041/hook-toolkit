import { useCallback } from 'react';
import { invalidateQueries } from './queryRegistry';
import type { InvalidateOptions } from './queryRegistry';

export type { InvalidateOptions } from './queryRegistry';

export type InvalidateQueries = (queryKey: unknown[], options?: InvalidateOptions) => Promise<void>;

/**
 * Returns a stable `invalidate` function that re-runs every mounted
 * {@link useFetch} whose `queryKey` matches — the TanStack-Query
 * `queryClient.invalidateQueries` pattern, without a provider or a cache.
 *
 * By default the match is a **prefix** match: `invalidate(['todos'])` refetches
 * `['todos']`, `['todos', 1]`, `['todos', { done: true }]`, … Pass
 * `{ exact: true }` to refetch only the identical key.
 *
 * @example
 * ```tsx
 * const invalidate = useInvalidateQueries();
 *
 * const { mutate: addTodo } = useMutation(createTodo, {
 *   onSuccess: () => invalidate(['todos']),
 * });
 * ```
 *
 * For calls outside React (or where you don't want a hook), import the
 * standalone `invalidateQueries` instead — it has the same signature.
 */
export function useInvalidateQueries(): InvalidateQueries {
  return useCallback(
    (queryKey: unknown[], options?: InvalidateOptions) => invalidateQueries(queryKey, options),
    [],
  );
}
