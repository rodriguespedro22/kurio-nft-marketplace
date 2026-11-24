import type { Buyer, Nft, Order, Quote, User, Wallet } from '@/contracts';

import type { NetworkProfileName } from '../network/profiles';
import type { ScenarioName } from '../scenarios/definitions';

export const MOCK_DB_VERSION = 1;

export type UserRecord = User & {
  passwordHash: string;
  ensName: string | null;
  walletLabel: string | null;
  createdAt: string;
};

export type SessionRecord = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type CartItemRecord = {
  id: string;
  nftId: string;
  editionId: string;
  quantity: number;
  addedAt: string;
};

/** `userId: null` = carrinho de visitante (chave = `guestCartId`). */
export type CartRecord = {
  id: string;
  userId: string | null;
  items: CartItemRecord[];
  couponCode: string | null;
  updatedAt: string;
};

export type QuoteRecord = Quote & {
  cartId: string;
  userId: string | null;
  createdAt: string;
};

export type OrderRecord = Order & {
  userId: string;
  quoteId: string;
  idempotencyKey: string;
  buyer: Buyer;
  /** Quando o mock resolve o pedido (reagendado no boot → sobrevive a refresh). */
  resolveAt: string;
};

export type WalletRecord = Wallet & { userId: string };

export type IdempotencyRecord = {
  key: string;
  userId: string;
  bodyHash: string;
  orderId: string;
  createdAt: string;
};

export type MockMeta = {
  version: typeof MOCK_DB_VERSION;
  scenario: ScenarioName;
  network: NetworkProfileName;
  /** Cenários `*-during-checkout`: a mudança acontece só na 1ª cotação do checkout. */
  firstCheckoutQuoteHandled: boolean;
};

/**
 * Banco do mock (em memória + localStorage). Versões de NFT e pedido vivem nos próprios
 * registros (`nft.version`, `order.version`) — fonte única para eventos e REST.
 */
export type MockDb = {
  meta: MockMeta;
  users: UserRecord[];
  sessions: SessionRecord[];
  nfts: Nft[];
  carts: Record<string, CartRecord>;
  favorites: Record<string, string[]>;
  quotes: Record<string, QuoteRecord>;
  orders: Record<string, OrderRecord>;
  wallets: WalletRecord[];
  idempotency: Record<string, IdempotencyRecord>;
  eventSeq: number;
  idSeq: number;
};
