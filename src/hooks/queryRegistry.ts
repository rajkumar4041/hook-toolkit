/**
 * A tiny module-level registry of active `useFetch` observers, keyed by their
 * `queryKey`. This is what gives `useFetch` a TanStack-Query-style
 * `invalidateQueries`: invalidating a key re-runs the `queryFn` of **every**
 * mounted `useFetch` whose key matches — across components, no provider needed.
 *
 * Deliberately minimal: there is still no stored/shared data cache, no
 * `staleTime`, and no dedup. Invalidation simply triggers `refetch()` on the
 * matching live observers.
 */

export interface QueryObserver {
  /** The observer's current query key. */
  queryKey: unknown[];
  /** Re-run this observer's query. */
  refetch: () => Promise<void>;
}

const observers = new Set<QueryObserver>();

/** Register an observer; returns an unsubscribe function. */
export function subscribeQuery(observer: QueryObserver): () => void {
  observers.add(observer);
  return () => {
    observers.delete(observer);
  };
}

/** Structural equality for a single key segment. */
function segmentsEqual(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Does `queryKey` match `filterKey`? By default this is a **prefix** match
 * (like TanStack Query): `['todos']` matches `['todos']`, `['todos', 1]`, etc.
 * With `exact`, the keys must be identical.
 */
export function keyMatches(queryKey: unknown[], filterKey: unknown[], exact: boolean): boolean {
  if (exact) {
    return (
      queryKey.length === filterKey.length &&
      filterKey.every((part, i) => segmentsEqual(part, queryKey[i]))
    );
  }
  if (filterKey.length > queryKey.length) return false;
  return filterKey.every((part, i) => segmentsEqual(part, queryKey[i]));
}

export interface InvalidateOptions {
  /** Require an exact key match instead of the default prefix match. */
  exact?: boolean;
}

/**
 * One query key (`['todos', 1]`), or several at once as an array of keys
 * (`[['todos'], ['users']]`). Several keys are detected when every top-level
 * element is itself an array — so a normal key whose segments are scalars is
 * always treated as a single key.
 */
export type QueryKeyFilter = unknown[] | unknown[][];

function normalizeKeys(filter: QueryKeyFilter): unknown[][] {
  const isListOfKeys = filter.length > 0 && filter.every((segment) => Array.isArray(segment));
  return isListOfKeys ? (filter as unknown[][]) : [filter];
}

/**
 * Refetch every mounted `useFetch` whose `queryKey` matches. Pass one key
 * (`['todos']`) or several (`[['todos'], ['users']]`). Prefix match by default;
 * pass `{ exact: true }` for an exact match. Each matching query refetches at
 * most once even if several of the keys match it. Resolves once all triggered
 * refetches settle.
 */
export function invalidateQueries(
  filter: QueryKeyFilter,
  options: InvalidateOptions = {},
): Promise<void> {
  const exact = options.exact ?? false;
  const keys = normalizeKeys(filter);
  const pending: Array<Promise<void>> = [];
  observers.forEach((observer) => {
    if (keys.some((key) => keyMatches(observer.queryKey, key, exact))) {
      pending.push(Promise.resolve().then(() => observer.refetch()));
    }
  });
  return Promise.all(pending).then(() => undefined);
}
