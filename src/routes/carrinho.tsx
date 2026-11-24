import { createFileRoute } from '@tanstack/react-router';

import { getSession } from '@/features/auth/session';
import { CartPage } from '@/features/cart/components/CartPage';
import { cartQueries } from '@/features/cart/queries';
import { cartOwnerOf } from '@/features/cart/use-cart-owner';

export const Route = createFileRoute('/carrinho')({
  // Público: visitante também tem carrinho. Prefetch sem bloquear (skeleton na hora).
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(cartQueries.detail(cartOwnerOf(getSession())));
  },
  component: CartPage,
});
