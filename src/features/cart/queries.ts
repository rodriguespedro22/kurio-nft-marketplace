import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { AddCartItemInput, Cart, CartAdjustment } from '@/contracts';
import { getGuestCartId, getSession } from '@/features/auth/session';
import { ApiError } from '@/shared/api/api-error';
import { qk } from '@/shared/api/query-keys';
import { announce } from '@/shared/ui/announce';

import { cartApi } from './api';
import { isNewestServerCart } from './server-cart';
import { cartKey, quotePrefix, useCartOwner, type CartOwner } from './use-cart-owner';

/** Prefixo de todas as mutações do carrinho (contagem de "última mutação em voo"). */
const CART_MUTATION = ['cart'] as const;

export const cartQueries = {
  detail: (owner: CartOwner) =>
    queryOptions({ queryKey: cartKey(owner), queryFn: ({ signal }) => cartApi.get(signal) }),
};

export function useCart() {
  return useQuery(cartQueries.detail(useCartOwner()));
}

/** Unidades no carrinho (contador do header e da barra inferior). */
export function useCartCount(): number {
  const { data } = useQuery({
    ...cartQueries.detail(useCartOwner()),
    select: (cart: Cart) => cart.items.reduce((sum, item) => sum + item.quantity, 0),
  });
  return data ?? 0;
}

/** Mensagem para falhas de escrita no carrinho: a do servidor quando é de disponibilidade. */
export function cartErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.code === 'AVAILABILITY_CONFLICT') return error.message;
  return fallback;
}

function notifyError(message: string) {
  announce(message, 'assertive');
  toast.error(message);
}

type KeyContext = { key: readonly unknown[] };

const isLastCartMutation = (queryClient: QueryClient) =>
  queryClient.isMutating({ mutationKey: CART_MUTATION }) === 1;

/** Aplica o carrinho do servidor só se for a resposta mais nova; senão recarrega a verdade. */
function applyServerCart(queryClient: QueryClient, key: readonly unknown[], cart: Cart) {
  if (isNewestServerCart(queryClient, key, cart)) queryClient.setQueryData(key, cart);
  else void queryClient.invalidateQueries({ queryKey: key });
}

/** Adiciona (ou soma) uma edição. O carrinho devolvido pelo servidor substitui o cache. */
export function useAddToCart() {
  const queryClient = useQueryClient();
  const owner = useCartOwner();
  return useMutation<Cart, Error, AddCartItemInput, KeyContext>({
    mutationKey: [...CART_MUTATION, 'add'],
    // Cliques seguidos no carrinho do card chegam ao servidor em ordem, um de cada vez.
    scope: { id: 'cart-add' },
    mutationFn: (input) => cartApi.add(input),
    onMutate: () => ({ key: cartKey(owner) }),
    onSuccess: (cart, _input, context) => {
      applyServerCart(queryClient, context.key, cart);
      void queryClient.invalidateQueries({ queryKey: quotePrefix(owner) });
    },
  });
}

type UpdateVariables = { quantity: number };
type UpdateContext = KeyContext & { previous: number | undefined };

const withQuantity = (cart: Cart | undefined, itemId: string, quantity: number) =>
  cart && { ...cart, items: cart.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)) };

/**
 * Quantidade da linha com atualização otimista. Fila por item (`scope`): os PATCH chegam ao
 * servidor na ordem dos cliques e o último vence. A resposta só substitui o cache quando não
 * há outra mutação do carrinho em voo (senão desfaria o otimismo dela). Erro → volta à
 * quantidade anterior, avisa (409 traz a disponibilidade atual) e revalida.
 */
export function useUpdateCartItem(itemId: string) {
  const queryClient = useQueryClient();
  const owner = useCartOwner();
  return useMutation<Cart, Error, UpdateVariables, UpdateContext>({
    mutationKey: [...CART_MUTATION, 'update', itemId],
    scope: { id: `cart-item:${itemId}` },
    mutationFn: ({ quantity }) => cartApi.update(itemId, quantity),
    onMutate: async ({ quantity }) => {
      const key = cartKey(owner);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Cart>(key)?.items.find((i) => i.id === itemId)?.quantity;
      queryClient.setQueryData<Cart>(key, (old) => withQuantity(old, itemId, quantity));
      return { key, previous };
    },
    onSuccess: (cart, _variables, context) => {
      if (!isLastCartMutation(queryClient)) {
        isNewestServerCart(queryClient, context.key, cart);
        return;
      }
      applyServerCart(queryClient, context.key, cart);
      void queryClient.invalidateQueries({ queryKey: quotePrefix(owner) });
    },
    onError: (error, _variables, context) => {
      if (context?.previous !== undefined && queryClient.getQueryData(context.key)) {
        queryClient.setQueryData<Cart>(context.key, (old) => withQuantity(old, itemId, context.previous!));
      }
      notifyError(cartErrorMessage(error, 'Não foi possível alterar a quantidade.'));
    },
    onSettled: (_cart, error, _variables, context) => {
      if (error && context && isLastCartMutation(queryClient)) {
        void queryClient.invalidateQueries({ queryKey: context.key });
      }
    },
  });
}

/** Remove a linha (na mesma fila do item: espera alterações de quantidade pendentes). */
export function useRemoveCartItem(itemId: string) {
  const queryClient = useQueryClient();
  const owner = useCartOwner();
  return useMutation<Cart, Error, void, KeyContext>({
    mutationKey: [...CART_MUTATION, 'remove', itemId],
    scope: { id: `cart-item:${itemId}` },
    mutationFn: () => cartApi.remove(itemId),
    onMutate: () => ({ key: cartKey(owner) }),
    onSuccess: (cart, _variables, context) => {
      void queryClient.invalidateQueries({ queryKey: quotePrefix(owner) });
      if (isLastCartMutation(queryClient)) applyServerCart(queryClient, context.key, cart);
      else {
        isNewestServerCart(queryClient, context.key, cart);
        queryClient.setQueryData<Cart>(
          context.key,
          (old) => old && { ...old, items: old.items.filter((i) => i.id !== itemId) },
        );
      }
    },
    onError: (error) => notifyError(cartErrorMessage(error, 'Não foi possível remover o item.')),
  });
}

function adjustmentMessage(adjustment: CartAdjustment, cart: Cart): string {
  const line = cart.items.find((i) => i.nftId === adjustment.nftId && i.editionId === adjustment.editionId);
  if (!line) return 'Um item do seu carrinho esgotou e não pôde ser mantido.';
  return `${line.nft.name} (edição ${line.editionLabel}) foi ajustado para ${adjustment.applied} — é o que há disponível.`;
}

/**
 * Leva o carrinho de visitante para o usuário recém-logado (`POST /cart/merge`). Ajustes de
 * disponibilidade são avisados; uma falha não impede o login — os itens continuam no carrinho
 * de visitante e entram no próximo login.
 */
export async function mergeGuestCart(queryClient: QueryClient): Promise<void> {
  const session = getSession();
  if (!session) return;
  const guestCartId = getGuestCartId();
  try {
    const { cart, adjustments } = await cartApi.merge(guestCartId);
    queryClient.setQueryData(qk.user(session.user.id).cart, cart);
    queryClient.removeQueries({ queryKey: ['guest', guestCartId] });
    for (const adjustment of adjustments) {
      const message = adjustmentMessage(adjustment, cart);
      announce(message, 'polite');
      toast.warning(message);
    }
  } catch {
    toast.error('Não foi possível trazer os itens do carrinho de visitante. Eles entram no próximo login.');
  }
}
