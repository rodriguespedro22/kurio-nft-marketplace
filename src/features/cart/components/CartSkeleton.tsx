import { Skeleton } from '@/shared/ui/skeleton';

/** Mesmas alturas das linhas (100 px no celular, 70 px no desktop). */
export function CartSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul aria-hidden="true" data-testid="cart-skeleton" className="flex flex-col gap-5 md:gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="flex h-[100px] gap-3 overflow-hidden rounded-[14px] bg-surface md:h-[70px] md:items-center md:rounded-none"
        >
          <Skeleton className="h-full w-[100px] rounded-[14px] md:size-[70px] md:rounded-[6px]" />
          <div className="flex flex-1 flex-col justify-center gap-2 pr-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
