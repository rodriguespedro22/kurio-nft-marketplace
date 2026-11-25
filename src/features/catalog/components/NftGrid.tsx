import type { NftListItem } from '@/contracts';
import { cn } from '@/shared/lib/utils';

import { CATALOG_PAGE_SIZE } from '../api';

import { NftCard } from './NftCard';
import { NftCardSkeleton } from './NftCardSkeleton';

// Celular: duas colunas com a da direita 32 px mais baixa (grade escalonada do frame mobile).
const GRID_CLASSES =
  'grid grid-cols-2 gap-x-4 gap-y-6 max-md:pb-8 max-md:[&>li:nth-child(even)]:translate-y-8 md:grid-cols-3 md:gap-y-8 xl:gap-x-8 xl:gap-y-18';

type NftGridProps = {
  items: NftListItem[];
  /** Mostrando o resultado anterior enquanto o novo carrega. */
  busy?: boolean;
  /** Nome acessível da lista. */
  label?: string;
};

/** Cards da 1ª fileira no celular (2 colunas): carregam cedo, com prioridade alta. */
const PRIORITY_CARDS = 2;

export function NftGrid({ items, busy = false, label = 'NFTs do catálogo' }: NftGridProps) {
  return (
    <ul
      aria-label={label}
      aria-busy={busy}
      className={cn(GRID_CLASSES, 'transition-opacity duration-200', busy && 'opacity-60')}
    >
      {items.map((nft, index) => (
        <li key={nft.id}>
          <NftCard nft={nft} priority={index < PRIORITY_CARDS} />
        </li>
      ))}
    </ul>
  );
}

export function NftGridSkeleton({ count = CATALOG_PAGE_SIZE }: { count?: number }) {
  return (
    <ul aria-hidden="true" className={GRID_CLASSES}>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <NftCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
