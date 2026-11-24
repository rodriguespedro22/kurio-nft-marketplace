import { useState } from 'react';

import type { Quote } from '@/contracts';
import { cn } from '@/shared/lib/utils';
import { formatEth } from '@/shared/money/eth';
import { LiveRegion } from '@/shared/ui/live-region';

type OrderSummaryProps = {
  quote: Quote;
  /** Carrinho mudou e a cotação nova ainda não chegou. */
  updating?: boolean;
  className?: string;
};

const row = 'flex items-baseline justify-between gap-4 [&>dd]:shrink-0 [&>dd]:whitespace-nowrap';

/**
 * Valores exatamente como a API cotou — o front só formata. Mudança de total é anunciada
 * (polite) para quem alterou a quantidade sem ver o resumo.
 */
export function OrderSummary({ quote, updating = false, className }: OrderSummaryProps) {
  const [seenTotal, setSeenTotal] = useState(quote.total);
  const [announcement, setAnnouncement] = useState('');
  if (quote.total !== seenTotal) {
    setSeenTotal(quote.total);
    setAnnouncement(`Total atualizado: ${formatEth(quote.total)}`);
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <dl
        aria-busy={updating || undefined}
        className={cn(
          'flex flex-col gap-3 text-body text-secondary transition-opacity',
          updating && 'opacity-60',
        )}
      >
        <div className={row}>
          <dt>Subtotal</dt>
          <dd data-testid="summary-subtotal" className="text-body-lg text-foreground tabular-nums">
            {formatEth(quote.subtotal)}
          </dd>
        </div>
        <div className={row}>
          <dt>Desconto do lançamento</dt>
          <dd data-testid="summary-discount" className="text-foreground tabular-nums">
            (-) {formatEth(quote.discount)}
          </dd>
        </div>
        <div className={row}>
          <dt>Taxa de rede</dt>
          <dd className="flex flex-col items-end">
            <span data-testid="summary-fee" className="text-body-lg text-foreground tabular-nums">
              {formatEth(quote.networkFee)}
            </span>
            <span className="text-caption text-accent">Taxa estimada</span>
          </dd>
        </div>
        <div className={cn(row, 'mt-3 border-t border-border pt-4')}>
          <dt className="font-bold text-foreground">Total</dt>
          <dd data-testid="summary-total" className="text-title-sm font-bold text-accent tabular-nums">
            {formatEth(quote.total)}
          </dd>
        </div>
      </dl>
      {quote.issues.length > 0 ? (
        <p
          role="note"
          className="rounded-field border border-error/60 bg-error/10 px-3 py-2 text-body-sm text-coral"
        >
          Alguns itens mudaram de preço ou de disponibilidade. Revise as quantidades antes de finalizar.
        </p>
      ) : null}
      <LiveRegion visuallyHidden>{announcement}</LiveRegion>
    </div>
  );
}
