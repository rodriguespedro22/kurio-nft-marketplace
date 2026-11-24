import { cn } from '@/shared/lib/utils';

const WIDTHS = [320, 640, 960] as const;
const BASE = `${import.meta.env.BASE_URL}images/nfts/`;

type NftImageProps = {
  /** Nome-base em `public/images/nfts` (ex.: `ape-emerald-a`). */
  asset: string;
  alt: string;
  /** `sizes` do srcset: largura que a arte ocupa em cada breakpoint. */
  sizes: string;
  /** Arte acima da dobra (LCP): carrega já, com prioridade alta. */
  priority?: boolean;
  className?: string;
};

const srcSet = (asset: string, ext: 'avif' | 'webp') =>
  WIDTHS.map((w) => `${BASE}${asset}-${w}.${ext} ${w}w`).join(', ');

/** Arte de NFT responsiva: AVIF com fallback WebP em 320/640/960 px, sempre quadrada. */
export function NftImage({ asset, alt, sizes, priority = false, className }: NftImageProps) {
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={srcSet(asset, 'avif')} sizes={sizes} />
      <img
        src={`${BASE}${asset}-640.webp`}
        srcSet={srcSet(asset, 'webp')}
        sizes={sizes}
        alt={alt}
        width={640}
        height={640}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
        className={cn('aspect-square size-full object-cover', className)}
      />
    </picture>
  );
}
