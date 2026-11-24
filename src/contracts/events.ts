import { z } from 'zod';

import { EthSchema, IdSchema, IsoDateTimeSchema } from './common';
import { NftStatusSchema } from './nft';
import { OrderStatusSchema } from './order';

/** Envelope comum (ARCHITECTURE.md §3): `eventId` para dedupe, `version` por recurso para ordem. */
const envelope = {
  eventId: z.string().min(1),
  version: z.number().int().min(0),
  occurredAt: IsoDateTimeSchema,
  /** Dono do recurso (pedidos); o cliente descarta eventos de outro usuário. */
  userId: IdSchema.optional(),
};

export const NftUpdatedEventSchema = z.object({
  ...envelope,
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: IdSchema }),
  data: z.object({
    editions: z.array(z.object({ id: IdSchema, price: EthSchema, available: z.number().int().min(0) })),
    status: NftStatusSchema,
  }),
});
export type NftUpdatedEvent = z.infer<typeof NftUpdatedEventSchema>;

export const OrderUpdatedEventSchema = z.object({
  ...envelope,
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: IdSchema }),
  data: z.object({
    status: OrderStatusSchema,
    txHash: z.string().nullable(),
    rejectionReason: z.string().nullable(),
    explorerUrl: z.string().nullable(),
  }),
});
export type OrderUpdatedEvent = z.infer<typeof OrderUpdatedEventSchema>;

export const RealtimeEventSchema = z.discriminatedUnion('type', [
  NftUpdatedEventSchema,
  OrderUpdatedEventSchema,
]);
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
export type RealtimeEventType = RealtimeEvent['type'];
