import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

import type { Cart } from '@/contracts';
import { NftRail } from '@/features/catalog/components/NftRail';
import { catalogQueries } from '@/features/catalog/queries';
import { BackButton } from '@/shared/layout/BackButton';
import { Breadcrumb } from '@/shared/layout/Breadcrumb';
import { buttonVariants } from '@/shared/ui/button-variants';
import { EmptyState } from '@/shared/ui/empty-state';
import { CartIcon } from '@/shared/ui/icons';
import { PageError } from '@/shared/ui/page-error';

import { useCart } from '../queries';
import { CartList } from './CartList';
import { CartSkeleton } from './CartSkeleton';

const TITLE_ID = 'carrinho-titulo';

/** "Colecionadores também viram": em alta, sem o que já está no carrinho. */
function AlsoViewed({ cart }: { cart: Cart | undefined }) {
  const { data } = useQuery(catalogQueries.list({ tab: 'trending', page: 1 }));
  const inCart = new Set(cart?.items.map((i) => i.nftId));
  const items = (data?.items ?? []).filter((item) => !inCart.has(item.id));
  return <NftRail id="tambem-viram" title="Colecionadores também viram" items={items} />;
}

/**
 * Página do carrinho: skeleton → linhas | vazio | erro com nova tentativa. Ao remover uma linha,
 * o foco vai para o "remover" da linha seguinte (ou o título, se o carrinho esvaziou).
 */
export function CartPage() {
  const { data: cart, error, isPending, isError, refetch } = useCart();
  const listRef = useRef<HTMLDivElement>(null);
  const focusAfterRemoval = useRef<number | null>(null);
  const count = cart?.items.length ?? 0;

  useEffect(() => {
    const index = focusAfterRemoval.current;
    if (index === null) return;
    focusAfterRemoval.current = null;
    const buttons = listRef.current?.querySelectorAll<HTMLElement>('[data-cart-remove]') ?? [];
    const target = buttons[Math.min(index, buttons.length - 1)] ?? document.getElementById(TITLE_ID);
    target?.focus();
  }, [count]);

  const empty = cart !== undefined && cart.items.length === 0;

  return (
    <div className="container-page flex flex-col gap-12 py-4 md:py-8 xl:gap-20">
      <title>Carrinho · Kurio</title>
      <div className="flex flex-col gap-4">
        <div className="relative flex min-h-11 items-center justify-center md:min-h-0">
          <BackButton className="absolute left-0 md:hidden" />
          <h1
            id={TITLE_ID}
            tabIndex={-1}
            className="text-title-sm font-bold text-foreground outline-none md:sr-only"
          >
            Carrinho de NFTs
          </h1>
        </div>
        <Breadcrumb current="Carrinho" />

        <div className="grid gap-10 xl:grid-cols-[minmax(0,782px)_minmax(0,332px)] xl:justify-between">
          <div ref={listRef} className="min-w-0">
            {isPending ? (
              <CartSkeleton />
            ) : isError ? (
              <PageError error={error} onRetry={() => void refetch()} />
            ) : empty ? (
              <EmptyState
                icon={<CartIcon className="size-6" />}
                title="Seu carrinho está vazio"
                description="Explore o catálogo e adicione NFTs para vê-los aqui."
                action={
                  <Link to="/" hash="catalogo" className={buttonVariants({ variant: 'primary' })}>
                    Explorar o catálogo
                  </Link>
                }
              />
            ) : (
              <CartList items={cart.items} onRemoved={(index) => (focusAfterRemoval.current = index)} />
            )}
          </div>

          {cart && !empty ? (
            <aside aria-labelledby="resumo-titulo" className="flex flex-col gap-6">
              <h2
                id="resumo-titulo"
                className="border-b border-border pb-3 text-section font-bold text-foreground"
              >
                Resumo da carteira
              </h2>
              <Link
                to="/"
                hash="catalogo"
                className="self-center text-body text-accent underline-offset-4 hover:underline"
              >
                Continuar explorando
              </Link>
            </aside>
          ) : null}
        </div>
      </div>

      <AlsoViewed cart={cart} />
    </div>
  );
}
