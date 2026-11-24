import { Skeleton } from '@/shared/ui/skeleton';

/** Mesma estrutura e alturas do `NftCard` — a troca skeleton → card não desloca o layout. */
export function NftCardSkeleton() {
  return (
    <div data-testid="nft-card-skeleton" className="flex flex-col gap-3">
      <div className="rounded-lg bg-surface p-1 pb-10">
        <Skeleton className="aspect-square w-full rounded-art" />
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <div className="flex h-6 items-center">
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex h-7 items-center">
          <Skeleton className="h-5 w-1/3" />
        </div>
      </div>
    </div>
  );
}
