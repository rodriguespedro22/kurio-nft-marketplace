import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import type { NftListItem } from '@/contracts';
import { cartErrorMessage, useAddToCart } from '@/features/cart/queries';
import { defaultEditionId } from '@/features/nft/editions';
import { nftQueries } from '@/features/nft/queries';
import { cn } from '@/shared/lib/utils';
import { announce } from '@/shared/ui/announce';
import { CartIcon } from '@/shared/ui/icons';

type CardCartButtonProps = { nft: NftListItem; className?: string };

function notifyError(message: string) {
  announce(message, 'assertive');
  toast.error(message);
}

/**
 * Carrinho do card: soma 1 unidade da edição que o detalhe pré-seleciona (a mais barata com estoque)
 * sem sair da lista. O item da lista não traz as edições, então o detalhe é buscado (ou lido do
 * cache) no clique. Cada clique acumula; o toast do mesmo NFT é atualizado em vez de empilhar.
 */
export function CardCartButton({ nft, className }: CardCartButtonProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const addToCart = useAddToCart();
  const [resolving, setResolving] = useState(false);
  const soldOut = nft.status === 'sold_out';
  const label = soldOut ? `${nft.name} esgotado` : `Adicionar ${nft.name} ao carrinho`;

  async function handleClick() {
    if (soldOut) return;
    setResolving(true);
    let edition;
    try {
      const detail = await queryClient.fetchQuery(nftQueries.detail(nft.id));
      const id = defaultEditionId(detail.editions);
      edition = detail.editions.find((e) => e.id === id && e.available > 0);
    } catch {
      notifyError('Não foi possível adicionar ao carrinho.');
      return;
    } finally {
      setResolving(false);
    }
    if (!edition) {
      notifyError(`${nft.name} esgotou.`);
      return;
    }
    const chosen = edition;
    addToCart.mutate(
      { nftId: nft.id, editionId: chosen.id, quantity: 1 },
      {
        onSuccess: (cart) => {
          const inCart =
            cart.items.find((i) => i.nftId === nft.id && i.editionId === chosen.id)?.quantity ?? 1;
          announce(`${nft.name} adicionado ao carrinho. ${inCart} no carrinho.`, 'polite');
          toast.success('Adicionado ao carrinho', {
            id: `card-cart:${nft.id}`,
            description: `${nft.name} · edição ${chosen.label} · ${inCart} no carrinho`,
            action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/carrinho' }) },
          });
        },
        onError: (error) => notifyError(cartErrorMessage(error, 'Não foi possível adicionar ao carrinho.')),
      },
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={soldOut}
      aria-busy={resolving || addToCart.isPending}
      aria-label={label}
      title={soldOut ? 'Esgotado' : 'Adicionar ao carrinho'}
      className={cn(className, 'disabled:pointer-events-none disabled:opacity-50')}
    >
      <CartIcon className="size-5" />
    </button>
  );
}
