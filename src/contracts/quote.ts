import { z } from 'zod';

import { EthSchema, IdSchema, IsoDateTimeSchema, NetworkSchema } from './common';

/** `POST /quotes` — itens e cupom vêm do carrinho do servidor; o cliente só escolhe a rede. */
export const QuoteInputSchema = z.object({ network: NetworkSchema });
export type QuoteInput = z.infer<typeof QuoteInputSchema>;

export const QuoteLineSchema = z.object({
  cartItemId: IdSchema,
  nftId: IdSchema,
  editionId: IdSchema,
  quantity: z.number().int().min(1),
  unitPrice: EthSchema,
  lineTotal: EthSchema,
});
export type QuoteLine = z.infer<typeof QuoteLineSchema>;

export const QuoteIssueSchema = z.discriminatedUnion('kind', [
  z.object({
    cartItemId: IdSchema,
    kind: z.literal('price_changed'),
    previous: EthSchema,
    current: EthSchema,
  }),
  z.object({
    cartItemId: IdSchema,
    kind: z.literal('insufficient'),
    requested: z.number().int().min(1),
    available: z.number().int().min(0),
  }),
  z.object({ cartItemId: IdSchema, kind: z.literal('sold_out') }),
]);
export type QuoteIssue = z.infer<typeof QuoteIssueSchema>;

export const AppliedCouponSchema = z.object({
  code: z.string(),
  status: z.literal('applied'),
  percent: z.number().min(0).max(100),
});
export type AppliedCoupon = z.infer<typeof AppliedCouponSchema>;

export const QuoteSchema = z.object({
  quoteId: IdSchema,
  version: z.number().int().min(1),
  network: NetworkSchema,
  lines: z.array(QuoteLineSchema),
  subtotal: EthSchema,
  discount: EthSchema,
  networkFee: EthSchema,
  total: EthSchema,
  coupon: AppliedCouponSchema.nullable(),
  issues: z.array(QuoteIssueSchema),
  expiresAt: IsoDateTimeSchema,
});
export type Quote = z.infer<typeof QuoteSchema>;
