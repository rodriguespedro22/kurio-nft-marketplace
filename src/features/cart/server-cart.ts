import type { QueryClient, QueryKey } from '@tanstack/react-query';

import type { Cart } from '@/contracts';

const latestSeen = new WeakMap<QueryClient, Map<string, string>>();

/**
 * Registra o carrinho devolvido por uma escrita e diz se ele é o mais novo já visto para essa key.
 * Escritas de itens diferentes correm em paralelo: a resposta de uma mais antiga pode chegar por
 * último e, aplicada, ressuscitaria um item já removido.
 */
export function isNewestServerCart(queryClient: QueryClient, key: QueryKey, cart: Cart): boolean {
  let seen = latestSeen.get(queryClient);
  if (!seen) {
    seen = new Map();
    latestSeen.set(queryClient, seen);
  }
  const id = JSON.stringify(key);
  const previous = seen.get(id);
  if (previous !== undefined && cart.updatedAt < previous) return false;
  seen.set(id, cart.updatedAt);
  return true;
}
