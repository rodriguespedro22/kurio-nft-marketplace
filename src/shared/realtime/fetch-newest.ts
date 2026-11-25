import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Busca REST que nunca faz o recurso regredir: se, enquanto a resposta viajava, um evento do socket
 * gravou no cache uma versão mais nova, a resposta (lida antes do evento) é descartada e o cache
 * fica. Sem isso, "Confirmado" vindo do evento voltava a "Pendente" com a resposta atrasada e, com o
 * socket conectado, nada mais corrigia a tela. Mesma regra de versão da porta de eventos.
 */
export async function fetchNewest<T extends { version: number }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  fetcher: () => Promise<T>,
): Promise<T> {
  const fetched = await fetcher();
  const cached = queryClient.getQueryData<T>(queryKey);
  return cached && cached.version > fetched.version ? cached : fetched;
}
