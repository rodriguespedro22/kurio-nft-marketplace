import { z } from 'zod';

import {
  AddressSchema,
  DisplayNameSchema,
  EmailSchema,
  EnsNameSchema,
  EthSchema,
  IdSchema,
  INVALID_ADDRESS,
  INVALID_ENS_OR_ADDRESS,
  IsoDateTimeSchema,
  isValidAddress,
  isValidEnsOrAddress,
  NetworkSchema,
  OptionalEnsOrAddressSchema,
  ProfileNameSchema,
  ReferralCodeSchema,
  UsernameSchema,
} from './common';
import { NftImageSchema } from './nft';
import { AppliedCouponSchema, QuoteLineSchema } from './quote';
import { WalletProviderSchema } from './wallet';

// ---------- Comprador (frame Pagamento —) ----------

const BuyerBaseSchema = z.object({
  displayName: DisplayNameSchema,
  username: UsernameSchema,
  network: NetworkSchema,
  profileName: ProfileNameSchema,
  walletAddress: AddressSchema,
  secondaryWalletOrEns: OptionalEnsOrAddressSchema,
  walletType: WalletProviderSchema,
  referralCode: ReferralCodeSchema,
  email: EmailSchema,
  ensName: EnsNameSchema,
  useOtherWallet: z.boolean(),
  notes: z.string().trim().max(500, 'Use no máximo 500 caracteres').optional(),
});

export const BuyerSchema = BuyerBaseSchema.refine((b) => isValidAddress(b.network, b.walletAddress), {
  path: ['walletAddress'],
  message: INVALID_ADDRESS,
  when: (payload) =>
    BuyerBaseSchema.pick({ network: true, walletAddress: true }).safeParse(payload.value).success,
}).refine((b) => isValidEnsOrAddress(b.network, b.secondaryWalletOrEns), {
  path: ['secondaryWalletOrEns'],
  message: INVALID_ENS_OR_ADDRESS,
  when: (payload) =>
    BuyerBaseSchema.pick({ network: true, secondaryWalletOrEns: true }).safeParse(payload.value).success,
});
export type Buyer = z.infer<typeof BuyerSchema>;

// ---------- Pedido ----------

export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'rejected']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/** Linha congelada no pedido: o recibo nunca depende do catálogo atual. */
export const OrderLineSnapshotSchema = QuoteLineSchema.extend({
  name: z.string(),
  tokenNumber: z.string(),
  editionLabel: z.string(),
  image: NftImageSchema,
});
export type OrderLineSnapshot = z.infer<typeof OrderLineSnapshotSchema>;

export const OrderSnapshotSchema = z.object({
  lines: z.array(OrderLineSnapshotSchema),
  subtotal: EthSchema,
  discount: EthSchema,
  networkFee: EthSchema,
  total: EthSchema,
  network: NetworkSchema,
  walletId: IdSchema,
  walletProvider: WalletProviderSchema,
  walletAddress: z.string(),
  coupon: AppliedCouponSchema.nullable(),
});
export type OrderSnapshot = z.infer<typeof OrderSnapshotSchema>;

export const OrderSchema = z.object({
  id: IdSchema,
  status: OrderStatusSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  version: z.number().int().min(1),
  txHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  snapshot: OrderSnapshotSchema,
});
export type Order = z.infer<typeof OrderSchema>;
export const OrderListSchema = z.array(OrderSchema);

/** `POST /orders` com header `Idempotency-Key`. */
export const CreateOrderInputSchema = z.object({
  quoteId: IdSchema,
  quoteVersion: z.number().int().min(1),
  walletId: IdSchema,
  network: NetworkSchema,
  buyer: BuyerSchema,
});
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;
