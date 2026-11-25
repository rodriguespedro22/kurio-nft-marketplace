import { Link } from '@tanstack/react-router';

import type { NftListItem } from '@/contracts';
import { FavoriteButton } from '@/features/favorites/components/FavoriteButton';
import { formatEth } from '@/shared/money/eth';
import { NftImage } from '@/shared/ui/nft-image';

const CARD_IMAGE_SIZES = '(min-width: 1280px) 258px, (min-width: 768px) 30vw, 46vw';

/** `priority`: card na primeira dobra (no celular, a 1ª fileira é o LCP da home). */
type NftCardProps = { nft: NftListItem; priority?: boolean };

/**
 * Card do catálogo. O nome é o link (esticado sobre o card inteiro), então o card todo é
 * clicável; o coração de favorito fica acima do link (`z-10`), sem aninhar controles. Alturas fixas no texto: o skeleton tem a mesma altura.
 */
export function NftCard({ nft, priority = false }: NftCardProps) {
  return (
    <article className="group relative flex flex-col gap-3">
      <div className="relative rounded-lg bg-surface p-1 pb-10 transition-colors group-hover:bg-surface-raised">
        <div className="overflow-hidden rounded-art">
          <NftImage
            asset={nft.image.asset}
            alt={nft.image.alt}
            sizes={CARD_IMAGE_SIZES}
            priority={priority}
            className="transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        </div>
        {nft.isRare ? (
          <span className="absolute top-1 left-1 rounded-tl-art rounded-br-lg bg-primary px-3 py-1 text-caption font-bold text-ink">
            RARO
          </span>
        ) : null}
        {nft.status === 'sold_out' ? (
          <span className="absolute top-2 right-2 rounded-control bg-ink/85 px-2 py-1 text-caption font-medium text-foreground">
            Esgotado
          </span>
        ) : null}
        <FavoriteButton item={nft} className="absolute right-1.5 bottom-0.5" />
      </div>

      <div className="flex flex-col gap-1 px-0.5">
        <h3 className="h-6 truncate text-body-lg leading-6 text-foreground">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary focus-visible:after:outline-solid"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex h-7 items-baseline gap-2 overflow-hidden leading-7 whitespace-nowrap">
          <span className="sr-only">Preço:</span>
          <span data-testid="nft-card-price" className="text-section font-bold text-accent">
            {formatEth(nft.price)}
          </span>
          {nft.previousPrice ? (
            <del className="text-body text-muted">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.previousPrice)}
            </del>
          ) : null}
        </p>
      </div>
    </article>
  );
}
