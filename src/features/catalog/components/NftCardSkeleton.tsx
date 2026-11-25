import { Skeleton } from '@/shared/ui/skeleton';

/** Mesma estrutura e alturas do `NftCard` — a troca skeleton → card não desloca o layout. */
export function NftCardSkeleton() {
  return (
    <div data-testid="nft-card-skeleton" className="flex flex-col gap-2 xl:gap-3">
      <div className="grid aspect-[175/200] place-items-center rounded-[20px] bg-surface px-1 xl:aspect-[258/300] xl:rounded-none">
        <Skeleton className="aspect-square w-full rounded-2xl xl:rounded-art" />
      </div>
      <div className="flex flex-col gap-1 pl-2 xl:gap-1.5 xl:pl-0">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}
