import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CircleX, LoaderCircle } from 'lucide-react';

import type { Order } from '@/contracts';
import { useSession } from '@/features/auth/session';
import { ApiError } from '@/shared/api/api-error';
import { buttonVariants } from '@/shared/ui/button-variants';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageError } from '@/shared/ui/page-error';
import { Skeleton } from '@/shared/ui/skeleton';

import { isTerminal, settleOrder } from '../apply-order-updated';
import { clearPendingOrder } from '../pending-order';
import { useOrder } from '../queries';
import { Receipt } from './Receipt';

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  rejected: 'Pagamento recusado',
};

function StatusBadge({ status }: { status: Order['status'] }) {
  const tone =
    status === 'confirmed'
      ? 'border-success/60 text-success'
      : status === 'rejected'
        ? 'border-error/60 text-coral'
        : 'border-amber/60 text-amber';
  return (
    <p role="status" className="flex items-center gap-2 text-body-sm text-secondary">
      Status do pedido:
      <span data-testid="order-status" className={`rounded-full border px-3 py-1 font-bold ${tone}`}>
        {STATUS_LABELS[status]}
      </span>
    </p>
  );
}

/** Pedido terminal visto pelo REST (refresh, reconexão, polling): mesmo efeito do evento. */
function useSettleWhenTerminal(order: Order | undefined) {
  const queryClient = useQueryClient();
  const userId = useSession()?.user.id;
  const terminal = order ? isTerminal(order.status) : false;
  const orderId = order?.id;
  useEffect(() => {
    if (terminal && userId && orderId) settleOrder(queryClient, userId, orderId);
  }, [terminal, userId, orderId, queryClient]);
}

/**
 * Status do pedido: pendente (aguardando a rede), recusado (motivo + carrinho preservado) ou
 * confirmado (recibo). O recibo só aparece com `status === 'confirmed'` vindo da API.
 */
export function OrderStatusView({ orderId }: { orderId: string }) {
  const order = useOrder(orderId);
  useSettleWhenTerminal(order.data);
  const userId = useSession()?.user.id;
  const notFound = order.error instanceof ApiError && order.error.status === 404;
  const forbidden = order.error instanceof ApiError && order.error.status === 403;
  // Pedido lembrado que o servidor não conhece (ex.: dados do mock resetados): esquece, senão o
  // checkout voltaria sempre para cá.
  useEffect(() => {
    if (notFound && userId) clearPendingOrder(userId, orderId);
  }, [notFound, userId, orderId]);

  if (order.isPending) {
    return (
      <div aria-hidden="true" className="mx-auto flex w-full max-w-[578px] flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (order.isError) {
    if (notFound) {
      return (
        <EmptyState
          title="Pedido não encontrado"
          description="Confira o link ou veja os NFTs disponíveis no catálogo."
          action={
            <Link to="/" hash="catalogo" className={buttonVariants({ variant: 'primary' })}>
              Explorar o catálogo
            </Link>
          }
        />
      );
    }
    if (forbidden) {
      return (
        <EmptyState
          title="Este pedido é de outra conta"
          description="Entre com a conta que fez a compra para ver o status e o recibo."
          action={
            <Link to="/" hash="catalogo" className={buttonVariants({ variant: 'primary' })}>
              Explorar o catálogo
            </Link>
          }
        />
      );
    }
    return <PageError error={order.error} onRetry={() => void order.refetch()} />;
  }

  const { status } = order.data;
  return (
    <div className="flex flex-col items-center gap-6">
      <StatusBadge status={status} />
      {status === 'confirmed' ? (
        <Receipt order={order.data} />
      ) : status === 'rejected' ? (
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <CircleX aria-hidden="true" className="size-12 text-coral" strokeWidth={1.5} />
          <h2 className="text-title-sm font-bold text-foreground">Pagamento recusado</h2>
          <p className="text-body text-secondary">{order.data.rejectionReason}</p>
          <p className="text-body-sm text-secondary">Seus itens continuam no carrinho.</p>
          <Link to="/carrinho" className={buttonVariants({ variant: 'primary' })}>
            Voltar ao carrinho
          </Link>
        </div>
      ) : (
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <LoaderCircle
            aria-hidden="true"
            className="size-12 animate-spin text-primary motion-reduce:animate-none"
          />
          <h2 className="text-title-sm font-bold text-foreground">Aguardando a confirmação da rede</h2>
          <p className="text-body text-secondary">
            Você pode sair desta tela: o pedido continua sendo processado e o status aparece aqui quando a
            rede responder.
          </p>
        </div>
      )}
    </div>
  );
}
