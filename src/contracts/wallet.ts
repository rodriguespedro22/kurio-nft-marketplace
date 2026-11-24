import { z } from 'zod';

import {
  AddressSchema,
  DisplayNameSchema,
  EmailSchema,
  EnsNameSchema,
  IdSchema,
  INVALID_ADDRESS,
  INVALID_ENS_OR_ADDRESS,
  isValidAddress,
  isValidEnsOrAddress,
  NetworkSchema,
  OptionalEnsOrAddressSchema,
  ProfileNameSchema,
  ReferralCodeSchema,
  WalletLabelSchema,
} from './common';

export const WalletSlotSchema = z.enum(['primary', 'secondary']);
export type WalletSlot = z.infer<typeof WalletSlotSchema>;

export const WALLET_PROVIDERS = ['walletconnect', 'metamask', 'coinbase'] as const;
export const WalletProviderSchema = z.enum(WALLET_PROVIDERS, { error: 'Selecione uma carteira' });
export type WalletProvider = z.infer<typeof WalletProviderSchema>;

export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  walletconnect: 'WalletConnect',
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
};

export const WalletConnectionSchema = z.enum(['disconnected', 'connected', 'declined']);
export type WalletConnection = z.infer<typeof WalletConnectionSchema>;

/** Campos do formulário Carteiras. */
const WalletFieldsSchema = z.object({
  displayName: DisplayNameSchema,
  label: WalletLabelSchema,
  network: NetworkSchema,
  profileName: ProfileNameSchema,
  address: AddressSchema,
  secondaryAddressOrEns: OptionalEnsOrAddressSchema,
  provider: WalletProviderSchema,
  referralCode: ReferralCodeSchema,
  email: EmailSchema,
  ensName: EnsNameSchema,
});

export const WalletSchema = WalletFieldsSchema.extend({
  id: IdSchema,
  slot: WalletSlotSchema,
  secondaryAddressOrEns: z.string().nullable(),
  connection: WalletConnectionSchema,
});
export type Wallet = z.infer<typeof WalletSchema>;
export const WalletListSchema = z.array(WalletSchema);

const WalletInputBaseSchema = WalletFieldsSchema.extend({ slot: WalletSlotSchema });

/** `POST /wallets` e `PATCH /wallets/:id` */
export const WalletInputSchema = WalletInputBaseSchema.refine((w) => isValidAddress(w.network, w.address), {
  path: ['address'],
  message: INVALID_ADDRESS,
  when: (payload) =>
    WalletInputBaseSchema.pick({ network: true, address: true }).safeParse(payload.value).success,
}).refine((w) => isValidEnsOrAddress(w.network, w.secondaryAddressOrEns), {
  path: ['secondaryAddressOrEns'],
  message: INVALID_ENS_OR_ADDRESS,
  when: (payload) =>
    WalletInputBaseSchema.pick({ network: true, secondaryAddressOrEns: true }).safeParse(payload.value)
      .success,
});
export type WalletInput = z.infer<typeof WalletInputSchema>;
