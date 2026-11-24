import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { Cart } from '@/contracts';
import { cartKey, useCartOwner } from '@/features/cart/use-cart-owner';
import { useRealtimeEvent } from '@/shared/realtime/use-realtime';

import { applyNftUpdated } from './apply-nft-updated';
import { addCartNotices, cartChangesFor, resetCartNotices } from './cart-notices';

/**
 * Aplica `nft.updated` no app inteiro (montado uma vez, sob o RealtimeProvider). Os avisos do
 * carrinho são calculados contra o carrinho em cache antes de ele ser invalidado.
 */
export function RealtimeSync() {
  const queryClient = useQueryClient();
  const owner = useCartOwner();
  const ownerKey = cartKey(owner).join(':');

  useEffect(() => {
    resetCartNotices(ownerKey);
  }, [ownerKey]);

  useRealtimeEvent('nft.updated', (event) => {
    addCartNotices(ownerKey, cartChangesFor(queryClient.getQueryData<Cart>(cartKey(owner)), event));
    applyNftUpdated(queryClient, event);
  });

  return null;
}
