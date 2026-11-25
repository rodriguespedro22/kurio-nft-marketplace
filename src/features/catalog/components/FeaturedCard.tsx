import { Link } from '@tanstack/react-router';

import { cn } from '@/shared/lib/utils';
import { formatEth } from '@/shared/money/eth';
import { NftImage } from '@/shared/ui/nft-image';
import { Skeleton } from '@/shared/ui/skeleton';

import { useFeatured } from '../queries';

/**
 * "NFT EM DESTAQUE / OFERTA LIMITADA" abaixo da sidebar (desktop): faixa com degradê da cor
 * primária, arte de 310 × 368 e três formas decorativas. Some se a API falhar.
 */
export function FeaturedCard({ className }: { className?: string }) {
  const { data, isPending } = useFeatured();
  const nft = data?.[1] ?? data?.[0];

  if (isPending) return <Skeleton aria-hidden="true" className={cn('h-[470px] w-full', className)} />;
  if (!nft) return null;

  return (
    <section
      aria-labelledby="destaque-title"
      className={cn(
        'group relative flex flex-col gap-4 bg-linear-to-b from-primary/10 to-primary/3 pt-6 pb-1',
        className,
      )}
    >
      <div className="flex flex-col gap-4 px-5">
        <h3 id="destaque-title" className="text-h2 leading-8 font-bold text-accent uppercase">
          NFT em destaque
        </h3>
        <p className="text-center text-title leading-4 font-bold text-foreground uppercase">
          Oferta limitada
        </p>
      </div>
      <Link
        to="/nft/$nftId"
        params={{ nftId: nft.id }}
        className="block h-[368px] overflow-hidden rounded-[22px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="sr-only">
          {nft.name}, {formatEth(nft.price)}
        </span>
        <NftImage
          asset={nft.image.asset}
          alt=""
          sizes="310px"
          className="h-full transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </Link>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[105px] left-[38px] size-[15px] rounded-[29px] bg-linear-135 from-primary/30 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[299px] left-4 size-[22px] rounded-[7px] border-2 border-success/20"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[343px] left-[248px] size-[45px] rounded-[29px] bg-linear-135 from-primary/30 to-transparent"
      />
    </section>
  );
}
