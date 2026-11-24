import { Link } from '@tanstack/react-router';

import { cn } from '@/shared/lib/utils';
import { formatEth } from '@/shared/money/eth';
import { NftImage } from '@/shared/ui/nft-image';
import { Skeleton } from '@/shared/ui/skeleton';

import { useFeatured } from '../queries';

/** "NFT EM DESTAQUE / OFERTA LIMITADA" abaixo da sidebar (desktop). Some se a API falhar. */
export function FeaturedCard({ className }: { className?: string }) {
  const { data, isPending } = useFeatured();
  const nft = data?.[1] ?? data?.[0];

  if (isPending)
    return <Skeleton aria-hidden="true" className={cn('h-[460px] w-full rounded-lg', className)} />;
  if (!nft) return null;

  return (
    <section
      aria-labelledby="destaque-title"
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg bg-surface bg-linear-to-b from-primary/10 to-primary/3',
        className,
      )}
    >
      <div className="flex flex-col gap-1 px-4 pt-5 pb-4">
        <h3 id="destaque-title" className="text-h2 font-bold text-accent uppercase">
          NFT em destaque
        </h3>
        <p className="text-title font-bold text-foreground uppercase">Oferta limitada</p>
      </div>
      <div className="overflow-hidden rounded-t-art">
        <NftImage
          asset={nft.image.asset}
          alt={nft.image.alt}
          sizes="310px"
          className="transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </div>
      <p className="flex items-baseline justify-between gap-2 px-4 py-3">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          className="truncate text-body-lg text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary focus-visible:after:outline-solid"
        >
          {nft.name}
        </Link>
        <span className="text-section font-bold whitespace-nowrap text-accent">{formatEth(nft.price)}</span>
      </p>
    </section>
  );
}
