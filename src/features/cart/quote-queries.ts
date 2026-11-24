import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Cart, QuoteInput } from '@/contracts';

import { couponApi, quoteApi } from './quote-api';
import { cartKey, quoteKey, quotePrefix, useCartOwner } from './use-cart-owner';

/**
 * Cotação do carrinho para a rede dada. `staleTime: 0` e key por dono: nunca reaproveitada entre
 * usuários; mudanças no carrinho invalidam o prefixo das cotações do dono.
 */
export function useQuote(input: QuoteInput, { enabled = true }: { enabled?: boolean } = {}) {
  const owner = useCartOwner();
  return useQuery({
    queryKey: quoteKey(owner, input),
    queryFn: ({ signal }) => quoteApi.create(input, signal),
    staleTime: 0,
    enabled,
  });
}

/** Cupom aplicado/removido no carrinho do servidor: atualiza o carrinho e pede nova cotação. */
function useCouponMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient();
  const owner = useCartOwner();
  return useMutation({
    mutationKey: ['cart', 'coupon'],
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKey(owner), cart);
      void queryClient.invalidateQueries({ queryKey: quotePrefix(owner) });
    },
  });
}

export const useApplyCoupon = () => useCouponMutation((code: string) => couponApi.apply(code));
export const useRemoveCoupon = () => useCouponMutation(() => couponApi.remove());
