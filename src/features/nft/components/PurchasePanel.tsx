import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import type { Edition, Nft, NftListItem } from '@/contracts';
import { cartErrorMessage, useAddToCart } from '@/features/cart/queries';
import { FavoriteButton } from '@/features/favorites/components/FavoriteButton';
import { formatEth } from '@/shared/money/eth';
import { announce } from '@/shared/ui/announce';
import { CartIcon } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/utils';
import { useMediaQuery } from '@/shared/lib/use-media-query';
import { QuantityStepper } from '@/shared/ui/quantity-stepper';

type PurchasePanelProps = {
  nft: Nft;
  listItem: NftListItem;
  edition: Edition | undefined;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
};

/**
 * Quantidade + COMPRAR / adicionar ao carrinho / Favoritar. No celular vira a barra fixa do layout
 * (Qtd., preço, "Comprar NFT" e carrinho); o coração fica no topo da página.
 */
export function PurchasePanel({ nft, listItem, edition, quantity, onQuantityChange }: PurchasePanelProps) {
  const navigate = useNavigate();
  const addToCart = useAddToCart();
  const available = edition?.available ?? 0;
  const soldOut = available === 0;
  const desktop = useMediaQuery('(min-width: 48rem)');

  function add(goToCart: boolean) {
    if (!edition || soldOut || addToCart.isPending) return;
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          if (goToCart) {
            void navigate({ to: '/carrinho' });
            return;
          }
          toast.success('Adicionado ao carrinho', {
            description: `${nft.name} · edição ${edition.label} × ${quantity}`,
            action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/carrinho' }) },
          });
        },
        onError: (error) => {
          const message = cartErrorMessage(error, 'Não foi possível adicionar ao carrinho.');
          announce(message, 'assertive');
          toast.error(message);
        },
      },
    );
  }

  return (
    <div
      data-testid="purchase-panel"
      data-bottom-bar=""
      className="max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:rounded-t-[40px] max-md:bg-surface max-md:px-6 max-md:pt-5 max-md:pb-[calc(2.25rem+env(safe-area-inset-bottom))] max-md:shadow-[0_0_20px_rgb(10_6_4/0.45)]"
    >
      {/* Quebra de linha também no tablet: a coluna de 768 px não comporta quantidade + Comprar + Favoritar. */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-5">
        <QuantityStepper
          label="Quantidade"
          visibleLabel="Qtd."
          labelClassName="md:sr-only"
          size="responsive"
          value={quantity}
          min={1}
          max={Math.max(available, 1)}
          onChange={onQuantityChange}
          disabled={soldOut}
          className="[&>p:empty]:-mt-1.5 [&>p:empty]:min-h-0"
        />
        {desktop ? null : (
          <p className="pt-[7px] text-title-sm leading-4 font-bold text-accent tabular-nums">
            <span className="sr-only">Preço da edição: </span>
            <span data-testid="nft-price">{edition ? formatEth(edition.price) : null}</span>
          </p>
        )}

        <div className="flex w-full items-center gap-3 md:w-auto md:gap-2">
          <button
            type="button"
            onClick={() => add(true)}
            disabled={soldOut}
            aria-busy={addToCart.isPending || undefined}
            className={cn(
              'inline-flex h-[60px] w-[196px] items-center justify-center rounded-[40px] bg-linear-[133deg] from-primary to-primary/80 text-body-lg leading-5 font-bold text-ink transition-colors hover:from-primary-dark hover:to-primary-dark disabled:cursor-not-allowed disabled:opacity-40',
              'md:h-10 md:w-[130px] md:rounded-[6px] md:bg-primary md:bg-none md:text-body-sm md:uppercase md:hover:bg-primary-dark',
            )}
          >
            Comprar<span className="whitespace-pre md:hidden"> NFT</span>
          </button>
          <button
            type="button"
            aria-label="Adicionar ao carrinho"
            onClick={() => add(false)}
            disabled={soldOut}
            className="grid size-[60px] shrink-0 place-items-center rounded-[40px] border border-border bg-surface-raised text-muted transition-colors hover:border-primary hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 md:hidden"
          >
            <CartIcon aria-hidden="true" className="size-5" />
          </button>
          <FavoriteButton item={listItem} variant="full" className="hidden md:inline-flex" />
        </div>
      </div>
      {soldOut ? <p className="mt-2 text-caption text-muted">Esta edição está esgotada.</p> : null}
    </div>
  );
}
