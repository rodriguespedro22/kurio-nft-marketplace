import { useState } from 'react';
import { Link } from '@tanstack/react-router';

import type { CartItem } from '@/contracts';
import { cn } from '@/shared/lib/utils';
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
      className={cn(
        'relative grid h-[100px] grid-cols-[100px_minmax(0,1fr)_auto] items-center rounded-[14px] bg-linear-135 from-surface to-surface-raised [grid-template-areas:"thumb_info_qty"]',
        'md:h-[70px] md:rounded-none md:bg-surface md:bg-none md:pr-6',
        CART_COLUMNS,
        remove.isPending && 'opacity-60',
      )}
    >
      <div className="h-full overflow-hidden rounded-[14px] [grid-area:thumb] md:size-[70px] md:rounded-[6px]">
        <NftImage asset={item.nft.image.asset} alt="" sizes="100px" className="h-full" />
      </div>

      <div className="flex h-full min-w-0 flex-col py-3 pl-2 [grid-area:info] md:h-auto md:gap-1.5 md:py-0 md:pl-4">
        <h2 className="truncate text-body leading-4 font-bold text-foreground md:text-body-lg md:leading-4">
          <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="hover:text-accent">
            {item.nft.name}
          </Link>
        </h2>
        {/* Layout: no celular a edição; no desktop o ID do token (a edição segue para o leitor de tela). */}
        <p className="mt-1.5 text-body-sm leading-4 text-secondary md:hidden">Edição: {item.editionLabel}</p>
        <p className="hidden text-body-sm leading-4 text-muted md:block">
          ID do token: #{item.nft.tokenNumber}
          <span className="sr-only"> · Edição: {item.editionLabel}</span>
        </p>
        {/* Celular: o valor da linha (preço × quantidade), como no frame. */}
        <p className="mt-auto text-section leading-4 font-bold text-accent tabular-nums md:hidden">
          <span className="sr-only">Total da linha: </span>
          {formatEth(mulEth(item.unitPrice, quantity))}
        </p>
      </div>

      <p className="hidden text-body-lg leading-4 font-bold text-secondary tabular-nums [grid-area:price] md:block">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(item.unitPrice)}
      </p>

      <div className="pr-4 [grid-area:qty] md:pr-0">
        {soldOut ? (
          <p className="text-body-sm text-coral">Edição esgotada</p>
        ) : (
          <QuantityStepper
            label={`Quantidade de ${name}`}
            size="cart"
            value={quantity}
            min={1}
            max={item.available}
            onChange={changeQuantity}
            disabled={remove.isPending}
            // Avisos abaixo dos botões, sem mudar a altura da linha.
            className="relative [&>p]:absolute [&>p]:top-[calc(100%+2px)] [&>p]:right-0 [&>p]:min-h-0 [&>p]:whitespace-nowrap md:[&>p]:right-auto md:[&>p]:left-0 [&>p+p]:top-[calc(100%+18px)]"
          />
        )}
      </div>

      <p className="hidden text-body-lg leading-4 font-bold text-accent tabular-nums [grid-area:total] md:block">
        <span className="sr-only">Total da linha: </span>
        {formatEth(mulEth(item.unitPrice, quantity))}
      </p>

      <button
        type="button"
        data-cart-remove=""
        aria-label={`Remover ${name} do carrinho`}
        onClick={removeLine}
        className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full text-secondary transition-colors hover:text-coral md:static md:size-6 md:[grid-area:remove]"
      >
        <DeleteIcon className="size-[18px] md:size-6" />
      </button>
    </article>
  );
}
