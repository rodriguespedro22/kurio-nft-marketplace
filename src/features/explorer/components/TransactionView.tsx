import { Link } from '@tanstack/react-router';
import { CircleCheck } from 'lucide-react';

import { NETWORK_LABELS } from '@/contracts';
import { ApiError } from '@/shared/api/api-error';
import { formatEth } from '@/shared/money/eth';
import { buttonVariants } from '@/shared/ui/button-variants';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageError } from '@/shared/ui/page-error';
import { Skeleton } from '@/shared/ui/skeleton';

import { useTransaction } from '../queries';

const row = 'flex flex-col gap-1 border-b border-primary/30 py-3 sm:flex-row sm:justify-between sm:gap-6';
const label = 'text-body-sm leading-4 text-secondary';
const value = 'text-body leading-5 text-foreground sm:text-right';

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

/** Transação de um pedido confirmado, no explorador simulado da demo. */
export function TransactionView({ hash }: { hash: string }) {
  const tx = useTransaction(hash);

  if (tx.isPending) {
    return (
      <div aria-busy="true" className="mx-auto flex w-full max-w-[578px] flex-col gap-4">
        <span className="sr-only">Carregando transação…</span>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (tx.isError) {
    if (tx.error instanceof ApiError && tx.error.status === 404) {
      return (
        <EmptyState
          title="Transação não encontrada"
          description="Só pedidos confirmados geram uma transação. Confira o link do recibo."
          action={
            <Link to="/" className={buttonVariants({ variant: 'primary' })}>
              Voltar ao início
            </Link>
          }
        />
      );
    }
    return <PageError error={tx.error} onRetry={() => void tx.refetch()} />;
  }

  const t = tx.data;
  return (
    <section
      aria-labelledby="tx-title"
      className="mx-auto flex w-full max-w-[578px] flex-col overflow-hidden rounded-lg bg-surface"
    >
      <div className="flex flex-col gap-2 px-6 pt-6">
        <h2 id="tx-title" className="text-section leading-6 font-bold text-foreground">
          Detalhes da transação
        </h2>
        <p className="text-body-sm text-secondary">
          Explorador simulado da demonstração: nenhuma transação real foi enviada à rede.
        </p>
      </div>
      <dl className="flex flex-col px-6 pb-6">
        <div className={row}>
          <dt className={label}>Hash</dt>
          <dd className={`${value} font-mono break-all`}>{t.hash}</dd>
        </div>
        <div className={row}>
          <dt className={label}>Status</dt>
          <dd className={`${value} inline-flex items-center gap-1.5 text-primary sm:justify-end`}>
            <CircleCheck aria-hidden="true" className="size-4" strokeWidth={1.5} />
            Confirmada
          </dd>
        </div>
        <div className={row}>
          <dt className={label}>Rede</dt>
          <dd className={value}>{NETWORK_LABELS[t.network]}</dd>
        </div>
        <div className={row}>
          <dt className={label}>Bloco</dt>
          <dd className={`${value} tabular-nums`}>{t.blockNumber.toLocaleString('pt-BR')}</dd>
        </div>
        <div className={row}>
          <dt className={label}>Data</dt>
          <dd className={value}>{dateTime(t.timestamp)}</dd>
        </div>
        <div className={row}>
          <dt className={label}>Tokens transferidos</dt>
          <dd className={`${value} tabular-nums`}>{t.tokens}</dd>
        </div>
        <div className={row}>
          <dt className={label}>Taxa de rede</dt>
          <dd className={`${value} tabular-nums`}>{formatEth(t.networkFee)}</dd>
        </div>
        <div className={`${row} border-b-0`}>
          <dt className={label}>Valor total</dt>
          <dd className={`${value} font-bold text-accent tabular-nums`}>{formatEth(t.value)}</dd>
        </div>
      </dl>
      <div aria-hidden="true" className="h-2.5 bg-primary" />
    </section>
  );
}
