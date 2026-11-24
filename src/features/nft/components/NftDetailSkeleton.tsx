import { Skeleton } from '@/shared/ui/skeleton';

/** Mesma grade da página carregada: galeria à esquerda, informações à direita. */
export function NftDetailSkeleton() {
  return (
    <div
      data-testid="nft-detail-skeleton"
      className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-10"
    >
      <div className="flex flex-col gap-4 md:flex-row-reverse md:items-start md:gap-7">
        <div className="flex-1 rounded-lg bg-surface p-3 md:p-5">
          <Skeleton className="aspect-square w-full rounded-art" />
        </div>
        <div className="flex gap-3 md:flex-col md:gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="size-18 rounded-lg md:size-25" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-11 w-2/3" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-16 w-2/3" />
      </div>
    </div>
  );
}
