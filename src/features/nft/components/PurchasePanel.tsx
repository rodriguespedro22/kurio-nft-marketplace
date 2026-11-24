import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import type { Edition, Nft, NftListItem } from '@/contracts';
import { cartErrorMessage, useAddToCart } from '@/features/cart/queries';
import { FavoriteButton } from '@/features/favorites/components/FavoriteButton';
import { formatEth } from '@/shared/money/eth';
import { announce } from '@/shared/ui/announce';
import { buttonVariants } from '@/shared/ui/button-variants';
import { CartIcon } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/utils';
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
      className="max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:rounded-t-[28px] max-md:border-t max-md:border-border max-md:bg-surface max-md:px-6 max-md:pt-4 max-md:pb-[calc(1rem+env(safe-area-inset-bottom))] max-md:shadow-bar"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <QuantityStepper
          label="Quantidade"
          visibleLabel="Qtd."
          labelClassName="md:sr-only"
          value={quantity}
          min={1}
          max={Math.max(available, 1)}
          onChange={onQuantityChange}
          disabled={soldOut}
        />
        <p className="pt-1 text-title-sm font-bold text-accent tabular-nums md:hidden">
          <span className="sr-only">Preço da edição: </span>
          {edition ? formatEth(edition.price) : null}
        </p>

        <div className="flex w-full items-center gap-3 md:w-auto md:gap-2">
          <button
            type="button"
            onClick={() => add(true)}
            disabled={soldOut}
            aria-busy={addToCart.isPending || undefined}
            className={cn(
              buttonVariants({ variant: 'primary', size: 'lg', shape: 'pill' }),
              'flex-1 md:h-10 md:flex-none md:rounded-field md:px-8 md:text-body-sm md:uppercase',
            )}
          >
            Comprar<span className="md:hidden"> NFT</span>
          </button>
          <button
            type="button"
            aria-label="Adicionar ao carrinho"
            onClick={() => add(false)}
            disabled={soldOut}
            className="grid size-14 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-accent transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40 md:size-10 md:rounded-field md:bg-transparent"
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
