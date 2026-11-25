import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateOrderInput, Order } from '@/contracts';
import { useSession } from '@/features/auth/session';
import { ApiError } from '@/shared/api/api-error';
import { qk } from '@/shared/api/query-keys';
import { useRealtimeStatus } from '@/shared/realtime/use-realtime';

import { ordersApi } from './api';
import { getOrCreateAttemptKey } from './idempotency';
import { rememberPendingOrder } from './pending-order';

/** Pausa antes do reenvio automático (a pessoa vê "Verificando seu pedido…"). */
export const RETRY_DELAY_MS = 1500;

/** Sem resposta (timeout de 8 s do cliente ou rede): o pedido pode ter sido criado no servidor. */
export const isUncertain = (error: unknown) =>
  error instanceof ApiError && (error.code === 'TIMEOUT' || error.code === 'NETWORK');

/**
 * Pedido por id. Enquanto `pending` e sem socket, consulta a cada 5 s; com socket conectado, o
 * `order.updated` mantém o cache (e cada conexão do socket confere o pedido pelo REST).
 */
export function useOrder(orderId: string) {
  const userId = useSession()?.user.id ?? '';
  const realtime = useRealtimeStatus();
  const query = useQuery({
    queryKey: qk.user(userId).order(orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
    enabled: Boolean(userId),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' && realtime !== 'connected' ? 5000 : false,
  });
  // Socket (re)conectado com o pedido pendente: um evento pode ter saído antes da conexão
  // (inclusive a primeira, logo após o carregamento) — o REST reconcilia.
  const pending = query.data?.status === 'pending';
  const { refetch } = query;
  useEffect(() => {
    if (pending && realtime === 'connected') void refetch();
  }, [pending, realtime, refetch]);
  return query;
}

/**
 * Cria o pedido com a chave da tentativa (mesma cotação → mesma chave). Em timeout/rede, avisa
 * (`onUncertain` → "Verificando seu pedido…") e, após uma pausa, reenvia uma vez com a mesma chave: o servidor
 * devolve o pedido já criado. Se falhar de novo, o erro sobe e "Tentar novamente" repete a chave.
 */
export function useCreateOrder({ onUncertain }: { onUncertain?: () => void } = {}) {
  const queryClient = useQueryClient();
  const userId = useSession()?.user.id ?? '';
  return useMutation({
    mutationKey: ['order', 'create'],
    mutationFn: async (input: CreateOrderInput): Promise<Order> => {
      const key = getOrCreateAttemptKey(userId, input.quoteId);
      try {
        return await ordersApi.create(input, key);
      } catch (error) {
        if (!isUncertain(error)) throw error;
        onUncertain?.();
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return ordersApi.create(input, key);
      }
    },
    onSuccess: (order) => {
      queryClient.setQueryData(qk.user(userId).order(order.id), order);
      if (order.status === 'pending') rememberPendingOrder(userId, order.id);
    },
  });
}
