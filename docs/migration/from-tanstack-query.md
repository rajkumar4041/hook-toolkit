# Migrating from `@tanstack/react-query` to `useFetch` / `useMutation`

`hook-toolkit` ships **`useFetch`** and **`useMutation`** as lightweight, typed
stand-ins for simple `useQuery` / `useMutation` usage — just `data`, loading,
and `error`, with zero runtime dependencies.

## When to migrate — and when NOT to

**Good fit** (what these hooks cover):

- A component loads data by some keys and shows loading/error.
- A form/button performs a mutation and shows pending/error.
- You want `keepPreviousData` for pagination.

**Stay on TanStack Query if you rely on any of:**

- A shared **data cache** across components (`useFetch` has no stored cache, only
  key-based **invalidation** — see [Query invalidation](#query-invalidation) below).
- Request **deduplication**, `staleTime`/`gcTime`, background refetch, `refetchOnWindowFocus`.
- Retries/`retryDelay`, infinite queries, suspense, devtools.

`useFetch`/`useMutation` deliberately omit all of the above. Mixing is fine —
migrate the simple hooks and leave cache-dependent ones on TanStack Query.

## Option mapping

### `useQuery` → `useFetch`

| `useQuery`                                                                    | `useFetch`               | Notes                                                               |
| ----------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------- |
| `queryKey`                                                                    | `queryKey`               | same — array of values; refetches on change                         |
| `queryFn: async () => …`                                                      | `queryFn: (signal) => …` | pass `signal` to `fetch` for cancellation                           |
| `enabled`                                                                     | `enabled`                | same                                                                |
| `placeholderData: keepPreviousData`                                           | `keepPreviousData: true` | keeps current data while a new key loads                            |
| `refetchOnWindowFocus: false`                                                 | —                        | not implemented (nothing to disable)                                |
| `data`, `error`, `isLoading`, `isFetching`, `isError`, `isSuccess`, `refetch` | same names               | `isLoading` = first load with no data; `isFetching` = any in-flight |
| `isFetched`, `isPlaceholderData`, `status: 'pending'`                         | —                        | not provided                                                        |

### `useMutation` → `useMutation`

| TanStack                                                                | hook-toolkit                                   | Notes                                                           |
| ----------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| `mutationFn`                                                            | `mutationFn` (1st arg)                         | same signature                                                  |
| `mutate`, `mutateAsync`                                                 | same                                           | `mutateAsync` **rejects** on error; `mutate` is fire-and-forget |
| `isPending`, `isError`, `isSuccess`, `isIdle`, `data`, `error`, `reset` | same names                                     | —                                                               |
| `onMutate`, `onSuccess`, `onError`, `onSettled`                         | same                                           | `onMutate` here does not support optimistic rollback context    |
| `queryClient.invalidateQueries({ queryKey })`                           | `useInvalidateQueries()` / `invalidateQueries` | refetches mounted `useFetch`es by key — see below               |

---

## Example 1 — a paginated list query

### Before (`@tanstack/react-query`)

```ts
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export const usePatientAllergyList = ({
  patientUuid,
  pagination,
  gridSorting,
  status,
  archive,
  searchString,
  xTENANTID,
  appointmentId,
  providerStatus,
  enabled = true,
}: Props): useBaseContent<OptionData> => {
  const prevPage = useRef<number>(pagination.page);
  const pageIndex = getPageIndexWhileSearch({ pagination, searchKey: searchString, prevPage });
  const pageSize = getPageSize(searchString, pagination);
  const sortData = gridSorting?.[0];
  const skip = useEncounterCreationGate();

  return useQuery({
    queryKey: [
      'patient-allergy-list',
      patientUuid,
      pageIndex,
      pageSize,
      gridSorting,
      status,
      archive,
      searchString,
      appointmentId,
      providerStatus,
      xTENANTID,
      sortData,
    ],
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    enabled: enabled && !skip,
    queryFn: async () =>
      await new PatientAllergyControllerApi(getConfigObject())
        .getPatientAllergy(
          pageIndex,
          pageSize,
          sortData?.field,
          sortData?.sort ?? undefined,
          patientUuid,
          appointmentId,
          status,
          archive,
          providerStatus,
          searchString,
          xTENANTID,
        )
        .then((res) => res?.data),
  });
};
```

### After (`hook-toolkit`)

```ts
import { useFetch } from 'hook-toolkit';

export const usePatientAllergyList = ({
  patientUuid,
  pagination,
  gridSorting,
  status,
  archive,
  searchString,
  xTENANTID,
  appointmentId,
  providerStatus,
  enabled = true,
}: Props) => {
  const prevPage = useRef<number>(pagination.page);
  const pageIndex = getPageIndexWhileSearch({ pagination, searchKey: searchString, prevPage });
  const pageSize = getPageSize(searchString, pagination);
  const sortData = gridSorting?.[0];
  const skip = useEncounterCreationGate();

  return useFetch({
    queryKey: [
      'patient-allergy-list',
      patientUuid,
      pageIndex,
      pageSize,
      gridSorting,
      status,
      archive,
      searchString,
      appointmentId,
      providerStatus,
      xTENANTID,
      sortData,
    ],
    enabled: enabled && !skip,
    keepPreviousData: true,
    queryFn: (signal) =>
      new PatientAllergyControllerApi(getConfigObject())
        .getPatientAllergy(
          pageIndex,
          pageSize,
          sortData?.field,
          sortData?.sort ?? undefined,
          patientUuid,
          appointmentId,
          status,
          archive,
          providerStatus,
          searchString,
          xTENANTID,
        )
        .then((res) => res?.data),
  });
};
```

**Diff:** import swapped, `placeholderData: keepPreviousData` → `keepPreviousData: true`,
`refetchOnWindowFocus` removed, `queryFn` now takes `signal`. Consumers reading
`data` / `isLoading` / `isError` / `refetch` keep working.

> If your `useBaseContent<T>` return type requires fields `useFetch` doesn't
> expose (e.g. `isFetched`, `isPlaceholderData`), either widen that type or map
> the result: `const q = useFetch(...); return { ...q, isFetched: q.isSuccess };`

---

## Example 2 — a create mutation (with a global loading wrapper)

### Before

```ts
import { useMutation } from '@tanstack/react-query';

export const useMutationWithLoading = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: MutationOptions<TData, unknown, TVariables>,
) => {
  const { setIsLoading } = useLoadingContext();
  return useMutation<TData, unknown, TVariables>({
    ...options,
    mutationFn: async (variables) => {
      setIsLoading(true);
      return mutationFn(variables).finally(() => setIsLoading(false));
    },
  });
};

export const usePatientAllergiesCreate = () =>
  useMutationWithLoading(async (params: { patientAllergy: Patientallergy; xTENANTID?: string }) =>
    new PatientAllergyControllerApi(getConfigObject()).createPatientAllergy(
      params.patientAllergy,
      params.xTENANTID,
    ),
  );
```

### After

```ts
import { useMutation } from 'hook-toolkit';

export const useMutationWithLoading = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Parameters<typeof useMutation<TData, TVariables>>[1],
) => {
  const { setIsLoading } = useLoadingContext();
  return useMutation<TData, TVariables>(async (variables) => {
    setIsLoading(true);
    return mutationFn(variables).finally(() => setIsLoading(false));
  }, options);
};

// usePatientAllergiesCreate is unchanged:
export const usePatientAllergiesCreate = () =>
  useMutationWithLoading(async (params: { patientAllergy: Patientallergy; xTENANTID?: string }) =>
    new PatientAllergyControllerApi(getConfigObject()).createPatientAllergy(
      params.patientAllergy,
      params.xTENANTID,
    ),
  );

// Consumer is unchanged:
const { mutateAsync: createAllergy } = usePatientAllergiesCreate();
await createAllergy({ patientAllergy, xTENANTID });
```

**Diff:** import swapped; the options object becomes positional args
(`useMutation(mutationFn, options)` instead of `useMutation({ mutationFn, ...options })`).
`mutateAsync` still rejects on error, so the `.finally()` and any `try/catch`
behave identically.

---

## Query invalidation

Like `queryClient.invalidateQueries`, you can refetch queries **by key** from
anywhere — no need to thread a `refetch` down to the mutation. There's still no
stored data cache; invalidation simply re-runs the `queryFn` of every **mounted**
`useFetch` whose key matches.

Matching mirrors TanStack: a **prefix** match by default, or pass `{ exact: true }`.

```tsx
import { useFetch, useMutation, useInvalidateQueries } from 'hook-toolkit';

function Todos() {
  const invalidate = useInvalidateQueries();

  const { data } = useFetch({
    queryKey: ['todos'],
    queryFn: (signal) => fetch('/api/todos', { signal }).then((r) => r.json()),
  });

  // Refetch every ['todos', …] query after a successful create.
  const { mutate: addTodo } = useMutation(createTodo, {
    onSuccess: () => invalidate(['todos']),
  });

  // invalidate(['todos', 1], { exact: true }) → only the exact key.
}
```

**Invalidate several keys at once** by passing an array of keys. A key is itself
an array, so multiple keys are an array _of_ arrays — each matching query still
refetches at most once:

```ts
invalidate([['todos'], ['users']]); // refetch all ['todos', …] and all ['users', …]
```

> Watch the nesting: `invalidate(['todos', 'users'])` is **one** key with two
> segments (`todos` then `users`), not two keys. Two keys = `[['todos'], ['users']]`.

Need to invalidate outside a component (a plain event handler, a store action)?
Import the standalone `invalidateQueries` — same signature, no hook required:

```ts
import { invalidateQueries } from 'hook-toolkit';
invalidateQueries(['todos']); // returns a Promise that resolves when refetches settle
```

**Before (TanStack):** `const qc = useQueryClient(); … onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] })`
**After (hook-toolkit):** `const invalidate = useInvalidateQueries(); … onSuccess: () => invalidate(['todos'])`

> Note: `enabled: false` queries are not registered, so they aren't refetched by
> an invalidation — they'll fetch when they become enabled, as in TanStack.

---

## Gotcha checklist

- [ ] Pass `signal` into `fetch`/XHR in `queryFn` if you want real cancellation.
- [ ] After a mutation that changes list data, `invalidate([...])` the affected keys (or call the query's `refetch()`).
- [ ] If a hook's return type names TanStack-only fields, map or widen it (see note above).
- [ ] Keep cache-dependent hooks on TanStack Query.
