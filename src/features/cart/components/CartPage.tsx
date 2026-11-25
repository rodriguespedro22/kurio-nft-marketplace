import { useEffect, useRef } from 'react';
import { useIsMutating, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

import type { Cart } from '@/contracts';
import { NftRail } from '@/features/catalog/components/NftRail';
import { CartChangeNotice } from '@/features/realtime-sync/CartChangeNotice';
import { catalogQueries } from '@/features/catalog/queries';
import { BackButton } from '@/shared/layout/BackButton';
import { Breadcrumb } from '@/shared/layout/Breadcrumb';
import { buttonVariants } from '@/shared/ui/button-variants';
import { EmptyState } from '@/shared/ui/empty-state';
import { CartIcon } from '@/shared/ui/icons';
import { PageError } from '@/shared/ui/page-error';

import { useCart } from '../queries';
import { useQuote } from '../quote-queries';
import { CartList } from './CartList';
import { CartSkeleton } from './CartSkeleton';
import { CouponForm } from './CouponForm';
import { OrderSummary } from './OrderSummary';
import { OrderSummarySkeleton } from './OrderSummarySkeleton';

const TITLE_ID = 'carrinho-titulo';

/** "Colecionadores também viram": em alta, sem o que já está no carrinho. */
function AlsoViewed({ cart }: { cart: Cart | undefined }) {
  const { data } = useQuery(catalogQueries.list({ tab: 'trending', page: 1 }));
  const inCart = new Set(cart?.items.map((i) => i.nftId));
  const items = (data?.items ?? []).filter((item) => !inCart.has(item.id));
  return <NftRail id="tambem-viram" title="Colecionadores também viram" items={items} />;
}

/**
 * Resumo da carteira: cupom + cotação do servidor (rede ethereum até o checkout escolher outra).
 * Enquanto uma mutação do carrinho ou a nova cotação está em voo, os valores antigos ficam
 * esmaecidos com `aria-busy` — nunca um total calculado no front.
 */
function CartSummary({ cart }: { cart: Cart }) {
  const quote = useQuote({ network: 'ethereum' });
  const cartMutations = useIsMutating({ mutationKey: ['cart'] });
  return (
    <>
      <CouponForm appliedCode={cart.couponCode} />
      {quote.data ? (
        <OrderSummary quote={quote.data} updating={cartMutations > 0 || quote.isFetching} />
      ) : quote.isError ? (
        <PageError
          error={quote.error}
          title="Não foi possível calcular o resumo"
          onRetry={() => void quote.refetch()}
          className="py-6"
        />
      ) : (
        <OrderSummarySkeleton />
      )}
    </>
  );
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
    <div className="container-page flex flex-col gap-12 py-4 md:pt-8 md:pb-6 xl:gap-24">
      <title>Carrinho · Kurio</title>
      <div className="flex flex-col gap-3">
        <div className="relative flex min-h-11 items-center justify-center max-md:mb-1 md:sr-only">
          <BackButton className="absolute left-0 size-[35px] border-border bg-surface-raised text-secondary md:hidden" />
          <h1
            id={TITLE_ID}
            tabIndex={-1}
            className="text-title-sm leading-4 font-bold text-foreground outline-none"
          >
            Carrinho de NFTs
          </h1>
        </div>
        <Breadcrumb current="Carrinho" />
        {cart && !empty ? <CartChangeNotice cart={cart} /> : null}

        <div className="grid gap-1 md:gap-10 xl:grid-cols-[minmax(0,782px)_minmax(0,332px)] xl:justify-between">
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
            <aside
              aria-labelledby="resumo-titulo"
              className="flex flex-col gap-3 max-md:-mx-4 max-md:rounded-t-[30px] max-md:bg-surface max-md:px-6 max-md:pt-6 max-md:pb-9 md:gap-6"
            >
              <h2
                id="resumo-titulo"
                className="border-b border-primary/30 pb-3 text-section leading-4 font-bold text-foreground max-md:sr-only"
              >
                Resumo da carteira
              </h2>
              <CartSummary cart={cart} />
              <Link
                to="/checkout"
                className="inline-flex h-[60px] w-full items-center justify-center rounded-[40px] bg-linear-[133deg] from-primary to-primary/80 text-body-lg leading-4 font-bold text-ink transition-colors hover:from-primary-dark hover:to-primary-dark max-md:mt-5 md:h-10 md:rounded-[3px] md:bg-primary md:bg-none md:text-body md:hover:bg-primary-dark"
              >
                Conectar e finalizar
              </Link>
              <Link
                to="/"
                hash="catalogo"
                className="self-center text-body leading-5 text-accent underline-offset-4 hover:underline max-md:hidden"
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
