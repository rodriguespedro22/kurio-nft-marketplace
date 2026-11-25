import { Link } from '@tanstack/react-router';

import type { NftListItem } from '@/contracts';
import { FavoriteButton } from '@/features/favorites/components/FavoriteButton';
import { cn } from '@/shared/lib/utils';
import { formatEth } from '@/shared/money/eth';
import { CartIcon, SearchIcon } from '@/shared/ui/icons';
import { NftImage } from '@/shared/ui/nft-image';

const CARD_IMAGE_SIZES = '(min-width: 1280px) 250px, (min-width: 768px) 30vw, 46vw';

/** Botão quadrado de 35 px das ações do card no desktop (layout: fundo elevado, borda, raio 4). */
const actionClass =
  'grid size-[35px] place-items-center rounded-[4px] border border-border bg-surface-raised text-foreground transition-colors hover:border-primary hover:text-accent';

/** `priority`: card na primeira dobra (no celular, a 1ª fileira é o LCP da home). */
type NftCardProps = { nft: NftListItem; priority?: boolean };

/**
 * Card do catálogo (layout: bloco de 258 × 300 com a arte de 250 px centrada, nome e preço abaixo).
 * O nome é o link, esticado sobre o card inteiro. No desktop, o hover (ou o foco dentro do card)
 * acende o filete superior e mostra carrinho, favorito e ver; o carrinho leva ao detalhe, onde se
 * escolhe a edição. Abaixo de 1280 px fica só o coração, no canto da arte, como no frame mobile.
 */
export function NftCard({ nft, priority = false }: NftCardProps) {
  return (
    <article className="group relative flex flex-col gap-2 xl:gap-3">
      <div
        className={cn(
          'relative grid aspect-[175/200] place-items-center rounded-[20px] bg-linear-135 from-surface to-surface-raised px-1 xl:aspect-[258/300] xl:rounded-none xl:bg-surface xl:bg-none',
          'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-primary before:opacity-0 before:transition-opacity xl:group-focus-within:before:opacity-100 xl:group-hover:before:opacity-100',
        )}
      >
        <div className="aspect-square w-full overflow-hidden rounded-2xl xl:rounded-art">
          <NftImage
            asset={nft.image.asset}
            alt={nft.image.alt}
            sizes={CARD_IMAGE_SIZES}
            priority={priority}
          />
        </div>
        {nft.isRare ? (
          <span className="absolute top-[8%] left-0 grid h-8 w-[68px] place-items-center bg-primary text-caption leading-4 font-medium text-ink xl:top-3.5 xl:h-[29px] xl:w-20 xl:text-body-lg">
            RARO
          </span>
        ) : null}
        {nft.status === 'sold_out' ? (
          <span className="absolute bottom-[calc(8.33%+0.5rem)] left-3 rounded-control bg-ink/85 px-2 py-1 text-caption font-medium text-foreground">
            Esgotado
          </span>
        ) : null}
        <div
          className={cn(
            'absolute top-[8%] right-2 z-10 flex gap-2.5 transition-opacity',
            'xl:top-auto xl:right-auto xl:bottom-[7px] xl:left-1/2 xl:-translate-x-1/2 xl:opacity-0 xl:group-focus-within:opacity-100 xl:group-hover:opacity-100',
          )}
        >
          {/* Atalhos de mouse para o mesmo destino do nome (fora da ordem de tabulação). */}
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            hash="comprar"
            tabIndex={-1}
            aria-hidden="true"
            title="Comprar"
            className={cn(actionClass, 'hidden xl:grid')}
          >
            <CartIcon className="size-5" />
          </Link>
          <FavoriteButton
            item={nft}
            className="size-7 border border-border bg-surface-raised backdrop-blur-none hover:bg-surface-raised xl:size-[35px] xl:rounded-[4px] xl:before:inset-0 xl:hover:border-primary [&_svg]:size-4 xl:[&_svg]:size-5"
          />
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            tabIndex={-1}
            aria-hidden="true"
            title="Ver detalhes"
            className={cn(actionClass, 'hidden xl:grid')}
          >
            <SearchIcon className="size-5" />
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-0 pl-2 xl:gap-1.5 xl:pl-0">
        <h3 className="h-5 truncate text-body leading-5 text-foreground xl:h-4 xl:text-body-lg xl:leading-4">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary focus-visible:after:outline-solid"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex h-4 items-baseline gap-3 overflow-hidden text-body-lg leading-4 whitespace-nowrap xl:text-section">
          <span className="sr-only">Preço:</span>
          <span data-testid="nft-card-price" className="font-bold text-accent">
            {formatEth(nft.price)}
          </span>
          {nft.previousPrice ? (
            <del className="text-muted decoration-border">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.previousPrice)}
            </del>
          ) : null}
        </p>
      </div>
    </article>
  );
}
