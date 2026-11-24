import { useState } from 'react';
import { Link } from '@tanstack/react-router';

import type { CartItem } from '@/contracts';
import { formatEth, mulEth } from '@/shared/money/eth';
import { announce } from '@/shared/ui/announce';
import { DeleteIcon } from '@/shared/ui/icons';
import { NftImage } from '@/shared/ui/nft-image';
import { QuantityStepper } from '@/shared/ui/quantity-stepper';

import { CART_COLUMNS } from '../layout';
import { cartLineName } from '../labels';
import { useRemoveCartItem, useUpdateCartItem } from '../queries';

type CartLineProps = {
  item: CartItem;
  /** Avisado depois que a linha sai do carrinho (a lista decide para onde vai o foco). */
  onRemoved: () => void;
};

/**
 * Linha do carrinho. A quantidade mostrada é a última pedida (estado local) enquanto os PATCH
 * estão na fila — cliques rápidos somam a partir do valor novo, não do que o servidor ainda não
 * confirmou; ao terminar, vale o carrinho do servidor (ou o rollback).
 */
export function CartLine({ item, onRemoved }: CartLineProps) {
  const update = useUpdateCartItem(item.id);
  const remove = useRemoveCartItem(item.id);
  const [requested, setRequested] = useState<number | null>(null);
  const quantity = requested ?? item.quantity;
  const name = cartLineName(item.nft.name, item.editionLabel);
  const soldOut = item.available === 0;

  function changeQuantity(next: number) {
    setRequested(next);
    update.mutate({ quantity: next }, { onSettled: () => setRequested(null) });
  }

  function removeLine() {
    if (remove.isPending) return;
    remove.mutate(undefined, {
      onSuccess: () => {
        announce(`${name} removido do carrinho.`);
        onRemoved();
      },
    });
  }

  return (
    <article
      aria-busy={remove.isPending || undefined}
      className={`grid grid-cols-[100px_minmax(0,1fr)_auto] gap-x-3 overflow-hidden rounded-lg bg-surface [grid-template-areas:"thumb_info_info"_"thumb_qty_remove"] md:items-center md:gap-x-4 ${CART_COLUMNS} ${remove.isPending ? 'opacity-60' : ''}`}
    >
      <div className="self-stretch [grid-area:thumb] md:size-[70px] md:self-auto">
        <NftImage asset={item.nft.image.asset} alt="" sizes="100px" className="h-full" />
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 pt-3 [grid-area:info] md:pt-0">
        <h2 className="truncate text-body font-bold text-foreground md:text-body-lg">
          <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="hover:text-accent">
            {item.nft.name}
          </Link>
        </h2>
        <p className="text-body-sm text-secondary">Edição: {item.editionLabel}</p>
        <p className="text-section font-bold text-accent tabular-nums md:hidden">
          <span className="sr-only">Preço unitário: </span>
          {formatEth(item.unitPrice)}
        </p>
      </div>

      <p className="hidden text-body-lg font-bold text-accent tabular-nums [grid-area:price] md:block">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(item.unitPrice)}
      </p>

      <div className="pb-2 [grid-area:qty] md:pt-5 md:pb-0">
        {soldOut ? (
          <p className="text-body-sm text-coral">Edição esgotada</p>
        ) : (
          <QuantityStepper
            label={`Quantidade de ${name}`}
            value={quantity}
            min={1}
            max={item.available}
            onChange={changeQuantity}
            disabled={remove.isPending}
          />
        )}
      </div>

      <p className="hidden text-body-lg font-bold text-accent tabular-nums [grid-area:total] md:block">
        <span className="sr-only">Total da linha: </span>
        {formatEth(mulEth(item.unitPrice, quantity))}
      </p>

      <div className="flex items-start justify-end pr-2 pb-2 [grid-area:remove] md:items-center md:justify-center md:p-0">
        <button
          type="button"
          data-cart-remove=""
          aria-label={`Remover ${name} do carrinho`}
          onClick={removeLine}
          className="grid size-11 place-items-center rounded-full text-secondary transition-colors hover:bg-surface-raised hover:text-coral"
        >
          <DeleteIcon className="size-5" />
        </button>
      </div>
    </article>
  );
}
