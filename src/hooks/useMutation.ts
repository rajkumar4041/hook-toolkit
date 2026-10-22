import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatest } from './useLatest';
import { useIsMounted } from './useIsMounted';

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

export interface UseMutationOptions<TData, TVariables> {
  /** Called just before the mutation runs. */
  onMutate?: (variables: TVariables) => void;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  /** Always called after success or error. */
  onSettled?: (data: TData | null, error: Error | null, variables: TVariables) => void;
}

export interface UseMutation<TData, TVariables> {
  /** Fire-and-forget. Never throws — errors go to `onError` and `error`. */
  mutate: (variables: TVariables) => void;
  /** Awaitable. Resolves with the data, or **rejects** on error (like TanStack). */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: Error | null;
  status: MutationStatus;
  isIdle: boolean;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  /** Reset back to idle, clearing data and error. */
  reset: () => void;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * A tiny, typed, TanStack-Query-style mutation hook for POST/PUT/DELETE and
 * other side effects — `mutate` / `mutateAsync`, `isPending`, `error`, `data`,
 * `reset`, and lifecycle callbacks. No cache or query invalidation; use TanStack
 * Query when you need those.
 *
 * @example
 * ```tsx
 * const { mutateAsync: createAllergy, isPending } = useMutation(
 *   (vars: { patientAllergy: Allergy; xTENANTID?: string }) =>
 *     api.createPatientAllergy(vars.patientAllergy, vars.xTENANTID),
 *   { onSuccess: () => toast('Saved') },
 * );
 * await createAllergy({ patientAllergy, xTENANTID });
 * ```
 *
 * `mutateAsync` **rejects** on error (so `await`/`try-catch`/`.finally()` work);
 * `mutate` is fire-and-forget and routes errors to `onError`. Only the latest
 * mutation updates state; state updates after unmount are suppressed.
 *
 * @param mutationFn `(variables) => Promise<TData>`.
 * @param options    `onMutate`, `onSuccess`, `onError`, `onSettled`.
 */
export function useMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {},
): UseMutation<TData, TVariables> {
  const mutationFnRef = useLatest(mutationFn);
  const onMutateRef = useLatest(options.onMutate);
  const onSuccessRef = useLatest(options.onSuccess);
  const onErrorRef = useLatest(options.onError);
  const onSettledRef = useLatest(options.onSettled);
  const isMounted = useIsMounted();

  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<MutationStatus>('idle');

  const requestIdRef = useRef(0);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      const id = ++requestIdRef.current;
      const isCurrent = () => requestIdRef.current === id && isMounted();

      if (isCurrent()) {
        setStatus('pending');
        setError(null);
      }
      onMutateRef.current?.(variables);

      try {
        const result = await mutationFnRef.current(variables);
        if (isCurrent()) {
          setData(result);
          setStatus('success');
        }
        onSuccessRef.current?.(result, variables);
        onSettledRef.current?.(result, null, variables);
        return result;
      } catch (err) {
        const e = toError(err);
        if (isCurrent()) {
          setError(e);
          setStatus('error');
        }
        onErrorRef.current?.(e, variables);
        onSettledRef.current?.(null, e, variables);
        throw e;
      }
    },
    [mutationFnRef, onMutateRef, onSuccessRef, onErrorRef, onSettledRef, isMounted],
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      void mutateAsync(variables).catch(() => {
        // Swallowed: error is already surfaced via `error`/`onError`.
      });
    },
    [mutateAsync],
  );

  const reset = useCallback(() => {
    requestIdRef.current++;
    setData(undefined);
    setError(null);
    setStatus('idle');
  }, []);

  // Suppress "latest" state updates after unmount (promises still settle).
  useEffect(() => () => void (requestIdRef.current = requestIdRef.current + 1), []);

  return {
    mutate,
    mutateAsync,
    data,
    error,
    status,
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isError: status === 'error',
    isSuccess: status === 'success',
    reset,
  };
}
