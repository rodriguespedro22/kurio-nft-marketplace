import { useId } from 'react';
import { MailOpen } from 'lucide-react';

import { NETWORK_LABELS, WALLET_PROVIDER_LABELS, type Order } from '@/contracts';
import { shortAddress } from '@/features/wallets/short-address';
import { formatEth } from '@/shared/money/eth';
import { buttonVariants } from '@/shared/ui/button-variants';
import { NftImage } from '@/shared/ui/nft-image';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** "29 Jul, 2026" (formato do layout), no fuso de quem vê. */
function receiptDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

const meta =
  'flex min-w-0 flex-col gap-0.5 px-3 first:pl-0 last:pr-0 [&>dt]:text-secondary [&>dd]:text-foreground';

/**
 * Recibo: só com o pedido `confirmed` da API e sempre a partir
 * do snapshot gravado no pedido — preço novo no catálogo não muda o que foi pago.
 */
export function Receipt({ order }: { order: Order }) {
  const titleId = useId();
  const { snapshot } = order;
  const network = NETWORK_LABELS[snapshot.network];

  return (
    <section
      aria-labelledby={titleId}
      className="mx-auto flex w-full max-w-[578px] flex-col overflow-hidden rounded-lg bg-surface"
    >
      <div className="flex flex-col items-center gap-4 px-6 pt-6 pb-5">
        <MailOpen aria-hidden="true" className="size-16 text-primary" strokeWidth={1.25} />
        <h2 id={titleId} className="text-center text-body-lg font-bold text-accent">
          Seus NFTs agora estão na sua carteira
        </h2>
      </div>

      <dl className="grid grid-cols-2 gap-y-3 border-y border-primary px-6 py-3 text-body-sm sm:flex sm:justify-between sm:divide-x sm:divide-primary">
        <div className={meta}>
          <dt className="font-bold">ID da transação</dt>
          <dd data-testid="receipt-tx" title={order.txHash ?? undefined} className="tabular-nums">
            {order.txHash ? shortAddress(order.txHash) : '—'}
          </dd>
        </div>
        <div className={meta}>
          <dt>Data</dt>
          <dd>
            <time dateTime={order.updatedAt}>{receiptDate(order.updatedAt)}</time>
          </dd>
        </div>
        <div className={meta}>
          <dt>Total</dt>
          <dd className="tabular-nums">{formatEth(snapshot.total)}</dd>
        </div>
        <div className={meta}>
          <dt className="font-bold">Carteira</dt>
          <dd>{WALLET_PROVIDER_LABELS[snapshot.walletProvider]}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-4 px-6 pt-6 pb-8 sm:px-11">
        <h3 className="text-body font-bold text-foreground">Detalhes da transação</h3>
        <div
          aria-hidden="true"
          className="grid grid-cols-[minmax(0,1fr)_44px_84px] border-b border-border pb-2 text-body text-foreground sm:grid-cols-[minmax(0,1fr)_72px_96px]"
        >
          <span>NFTs</span>
          <span className="text-center">Edições</span>
          <span className="text-right">Subtotal</span>
        </div>
        <ul aria-label="Itens do pedido" className="flex flex-col gap-3">
          {snapshot.lines.map((line) => (
            <li
              key={line.cartItemId}
              className="grid grid-cols-[minmax(0,1fr)_44px_84px] items-center text-body-sm sm:grid-cols-[minmax(0,1fr)_72px_96px]"
            >
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <NftImage
                  asset={line.image.asset}
                  alt=""
                  sizes="66px"
                  className="size-11 shrink-0 rounded-md sm:size-16"
                />
                <div className="flex min-w-0 flex-col">
                  <span className="font-bold break-words text-foreground sm:truncate">{line.name}</span>
                  <span className="break-words text-secondary sm:truncate">
                    ID do token: #{line.tokenNumber}
                  </span>
                </div>
              </div>
              <span className="text-center text-secondary">
                <span className="sr-only">Edições: </span>(x {line.quantity})
              </span>
              <span className="text-right font-bold text-accent tabular-nums">
                {formatEth(line.lineTotal)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="ml-auto flex w-full max-w-80 flex-col gap-2 text-body">
          {snapshot.coupon ? (
            <div className="flex justify-between gap-4">
              <dt className="text-secondary">Desconto ({snapshot.coupon.code})</dt>
              <dd className="text-foreground tabular-nums">(-) {formatEth(snapshot.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-foreground">Taxa de rede</dt>
            <dd data-testid="receipt-fee" className="text-foreground tabular-nums">
              {formatEth(snapshot.networkFee)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-bold text-foreground">Total</dt>
            <dd data-testid="receipt-total" className="text-body-lg font-bold text-accent tabular-nums">
              {formatEth(snapshot.total)}
            </dd>
          </div>
        </dl>

        <p className="border-t border-border pt-4 text-center text-body-sm text-secondary">
          Transação confirmada na {network}. A propriedade foi transferida para sua carteira conectada e
          registrada na rede.
        </p>
        {order.explorerUrl ? (
          <a
            href={order.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'primary', className: 'self-center' })}
          >
            Ver no explorador
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        ) : null}
      </div>
      <div aria-hidden="true" className="h-2.5 bg-primary" />
    </section>
  );
}
