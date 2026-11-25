import { createFileRoute } from '@tanstack/react-router';

import { OrderStatusView } from '@/features/orders/components/OrderStatusView';
import { Breadcrumb } from '@/shared/layout/Breadcrumb';

export const Route = createFileRoute('/_auth/pedido/$orderId')({
  component: OrderPage,
});

function OrderPage() {
  const { orderId } = Route.useParams();
  return (
    <div className="container-page flex flex-col gap-6 py-4 md:py-8">
      <title>Pedido · Kurio</title>
      <h1 className="sr-only">Pedido</h1>
      <Breadcrumb current="Pagamento" />
      <OrderStatusView key={orderId} orderId={orderId} />
    </div>
  );
}
