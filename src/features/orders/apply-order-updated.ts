import type { QueryClient } from '@tanstack/react-query';

import type { Order, OrderStatus, OrderUpdatedEvent } from '@/contracts';
import { qk } from '@/shared/api/query-keys';

import { clearAttemptKey } from './idempotency';
import { clearPendingOrder } from './pending-order';

export const isTerminal = (status: OrderStatus) => status === 'confirmed' || status === 'rejected';

/**
 * Fim da tentativa de compra (por evento ou pelo REST): esquece o pedido pendente e a chave, e o
 * carrinho/cotação são recarregados (o servidor tirou do carrinho só o que foi comprado).
 */
export function settleOrder(queryClient: QueryClient, userId: string, orderId: string): void {
  clearPendingOrder(userId, orderId);
  clearAttemptKey(userId);
  void queryClient.invalidateQueries({ queryKey: qk.user(userId).cart });
  void queryClient.invalidateQueries({ queryKey: ['user', userId, 'quote'] });
}

/**
 * `order.updated` do dono (já filtrado e deduplicado pelo provider): atualiza o pedido em cache só
 * com versão maior — evento antigo nunca faz "Confirmado" voltar a "Pendente".
 */
export function applyOrderUpdated(queryClient: QueryClient, userId: string, event: OrderUpdatedEvent): void {
  const key = qk.user(userId).order(event.resource.id);
  const cached = queryClient.getQueryData<Order>(key);
  if (cached) {
    if (event.version <= cached.version || isTerminal(cached.status)) return;
    queryClient.setQueryData<Order>(key, {
      ...cached,
      ...event.data,
      version: event.version,
      updatedAt: event.occurredAt,
    });
  } else {
    void queryClient.invalidateQueries({ queryKey: key });
  }
  if (isTerminal(event.data.status)) settleOrder(queryClient, userId, event.resource.id);
}
