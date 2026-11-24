import { z } from 'zod';

import { EthSchema, IdSchema, IsoDateTimeSchema } from './common';
import { NftListItemSchema } from './nft';

export const QuantitySchema = z
  .number('Informe a quantidade')
  .int('Use um número inteiro')
  .min(1, 'A quantidade mínima é 1');

/** Item identificado por `(nftId, editionId)`; disponibilidade é por edição. */
export const CartItemSchema = z.object({
  id: IdSchema,
  nftId: IdSchema,
  editionId: IdSchema,
  editionLabel: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: EthSchema,
  available: z.number().int().min(0),
  nft: NftListItemSchema,
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  id: IdSchema,
  items: z.array(CartItemSchema),
  /** Cupom aplicado fica no carrinho do servidor; `POST /quotes` o lê daqui. */
  couponCode: z.string().nullable(),
  updatedAt: IsoDateTimeSchema,
});
export type Cart = z.infer<typeof CartSchema>;

export const AddCartItemInputSchema = z.object({
  nftId: IdSchema,
  editionId: IdSchema,
  quantity: QuantitySchema,
});
export type AddCartItemInput = z.infer<typeof AddCartItemInputSchema>;

export const UpdateCartItemInputSchema = z.object({ quantity: QuantitySchema });
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemInputSchema>;

export const MergeCartInputSchema = z.object({ guestCartId: IdSchema });
export type MergeCartInput = z.infer<typeof MergeCartInputSchema>;

export const CartAdjustmentSchema = z.object({
  nftId: IdSchema,
  editionId: IdSchema,
  requested: z.number().int().min(0),
  applied: z.number().int().min(0),
});
export type CartAdjustment = z.infer<typeof CartAdjustmentSchema>;

export const MergeCartResponseSchema = z.object({
  cart: CartSchema,
  adjustments: z.array(CartAdjustmentSchema),
});
export type MergeCartResponse = z.infer<typeof MergeCartResponseSchema>;

/** `PUT /cart/coupon` */
export const ApplyCouponInputSchema = z.object({
  code: z.string('Informe o código').trim().min(1, 'Informe o código').toUpperCase(),
});
export type ApplyCouponInput = z.infer<typeof ApplyCouponInputSchema>;
