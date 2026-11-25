import type { RefObject } from 'react';

import { NETWORK_LABELS, WALLET_PROVIDER_LABELS, type Network, type Quote, type Wallet } from '@/contracts';
import { shortAddress } from '@/features/wallets/short-address';
import { formatEth } from '@/shared/money/eth';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { PageError } from '@/shared/ui/page-error';
import { Skeleton } from '@/shared/ui/skeleton';

import { quoteChanges } from '../quote-changes';
import { QuoteDiff } from './QuoteDiff';

type ReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cotação que estava na tela quando a pessoa pediu a revisão. */
  previous: Quote;
  /** Cotação renovada ao abrir a revisão (`null` enquanto chega). */
  current: Quote | null;
  error: unknown;
  onRetry: () => void;
  lineNames: Record<string, string>;
  wallet: Wallet;
  network: Network;
  /** Envio do pedido; sem ele o botão fica desabilitado. */
  onConfirm?: (quote: Quote) => void;
  confirming?: boolean;
  /** Aberto por código (sem DialogTrigger): para onde o foco volta ao fechar. */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

const row = 'flex items-baseline justify-between gap-4 [&>dd]:shrink-0 [&>dd]:text-right';

/**
 * Revisão antes de comprar: a cotação é renovada ao abrir e mostrada como a API devolveu
 * (itens, subtotal, desconto, taxa, total), com a carteira e a rede escolhidas.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  previous,
  current,
  error,
  onRetry,
  lineNames,
  wallet,
  network,
  onConfirm,
  confirming = false,
  returnFocusRef,
}: ReviewDialogProps) {
  const changes = current ? quoteChanges(previous, current, lineNames) : [];
  const blocked = !current || current.issues.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef?.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Revise sua compra</DialogTitle>
          <DialogDescription>Valores da cotação atual. Confira antes de confirmar.</DialogDescription>
        </DialogHeader>

        {current ? (
          <div className="flex flex-col gap-5">
            <QuoteDiff changes={changes} />
            <ul aria-label="Itens da compra" className="flex flex-col gap-2 text-body-sm">
              {current.lines.map((line) => (
                <li key={line.cartItemId} className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0 text-foreground">
                    {lineNames[line.cartItemId] ?? 'Item'}{' '}
                    <span className="text-secondary">(x {line.quantity})</span>
                  </span>
                  <span className="shrink-0 text-accent tabular-nums">{formatEth(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-2 border-t border-border pt-4 text-body-sm text-secondary">
              <div className={row}>
                <dt>Subtotal</dt>
                <dd className="text-foreground tabular-nums">{formatEth(current.subtotal)}</dd>
              </div>
              <div className={row}>
                <dt>Desconto do lançamento</dt>
                <dd className="text-foreground tabular-nums">(-) {formatEth(current.discount)}</dd>
              </div>
              <div className={row}>
                <dt>Taxa de rede</dt>
                <dd className="text-foreground tabular-nums">{formatEth(current.networkFee)}</dd>
              </div>
              <div className={`${row} border-t border-border pt-3`}>
                <dt className="font-bold text-foreground">Total</dt>
                <dd data-testid="review-total" className="text-body-lg font-bold text-accent tabular-nums">
                  {formatEth(current.total)}
                </dd>
              </div>
              <div className={`${row} pt-2`}>
                <dt>Carteira</dt>
                <dd className="text-foreground">
                  {WALLET_PROVIDER_LABELS[wallet.provider]} · {shortAddress(wallet.address)}
                </dd>
              </div>
              <div className={row}>
                <dt>Rede</dt>
                <dd className="text-foreground">{NETWORK_LABELS[network]}</dd>
              </div>
            </dl>
            {current.issues.length > 0 ? (
              <p role="note" className="text-body-sm text-coral">
                Alguns itens mudaram de preço ou de disponibilidade. Ajuste o carrinho antes de comprar.
              </p>
            ) : null}
          </div>
        ) : error ? (
          <PageError
            error={error}
            title="Não foi possível atualizar a cotação"
            onRetry={onRetry}
            className="py-4"
          />
        ) : (
          <div aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">Atualizando a cotação…</span>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Voltar</Button>
          </DialogClose>
          <Button
            disabled={blocked || !onConfirm}
            loading={confirming}
            onClick={() => current && onConfirm?.(current)}
          >
            Confirmar compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
