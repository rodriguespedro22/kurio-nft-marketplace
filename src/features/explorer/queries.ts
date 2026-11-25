import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/api-error';
import { qk } from '@/shared/api/query-keys';

import { explorerApi } from './api';

/** Transação confirmada não muda: fica em cache sem refetch; 404 não é tentado de novo. */
export function useTransaction(hash: string) {
  return useQuery({
    queryKey: qk.transaction(hash),
    queryFn: ({ signal }) => explorerApi.transaction(hash, signal),
    staleTime: Infinity,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}
