import { OrderSchema, type CreateOrderInput, type Order } from '@/contracts';
import { request } from '@/shared/api/client';

export const ordersApi = {
  /** `POST /orders` — a mesma `Idempotency-Key` devolve o mesmo pedido (replay). */
  create: (input: CreateOrderInput, idempotencyKey: string): Promise<Order> =>
    request(
      { url: '/orders', method: 'POST', data: input, headers: { 'Idempotency-Key': idempotencyKey } },
      OrderSchema,
    ),

  get: (id: string, signal?: AbortSignal): Promise<Order> =>
    request({ url: `/orders/${encodeURIComponent(id)}`, signal }, OrderSchema),
};
