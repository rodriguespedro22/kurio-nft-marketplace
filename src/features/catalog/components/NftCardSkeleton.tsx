import { Skeleton } from '@/shared/ui/skeleton';

/** Mesma estrutura e alturas do `NftCard` — a troca skeleton → card não desloca o layout. */
export function NftCardSkeleton() {
  return (
    <div data-testid="nft-card-skeleton" className="flex flex-col gap-3">
      <div className="grid aspect-[258/300] place-items-center bg-surface px-1">
        <Skeleton className="aspect-square w-full rounded-art" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}
