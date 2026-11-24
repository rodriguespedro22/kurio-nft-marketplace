import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/api-error';

const MAX_RETRIES = 2;

/** Só falhas transitórias valem nova tentativa; 4xx, timeout e erros de contrato não. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES || !(error instanceof ApiError)) return false;
  return error.code === 'NETWORK' || error.code === 'TRANSIENT' || error.status >= 500;
}

export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: (attempt) => 500 * 2 ** attempt,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 0 },
    },
  });

  // Dados privados envelhecem mais rápido e revalidam ao voltar para a aba.
  client.setQueryDefaults(['user'], { staleTime: 10_000, refetchOnWindowFocus: true });
  client.setQueryDefaults(['categories'], { staleTime: 300_000 });
  return client;
}
