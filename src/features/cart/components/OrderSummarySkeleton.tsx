import { Skeleton } from '@/shared/ui/skeleton';

/** Mesmas linhas e alturas do resumo (Subtotal, Desconto, Taxa + legenda, Total). */
export function OrderSummarySkeleton() {
  return (
    <div aria-hidden="true" data-testid="order-summary-skeleton" className="flex flex-col gap-3">
      {['h-7', 'h-6', 'h-11'].map((height, i) => (
        <div key={i} className={`flex items-center justify-between ${height}`}>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
      <div className="mt-3 flex h-12 items-center justify-between border-t border-border pt-4">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  );
}
