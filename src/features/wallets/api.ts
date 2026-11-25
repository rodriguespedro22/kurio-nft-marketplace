import { WalletListSchema, WalletSchema, type Wallet, type WalletInput } from '@/contracts';
import { request } from '@/shared/api/client';

const path = (id: string) => `/wallets/${encodeURIComponent(id)}`;

export const walletsApi = {
  list: (signal?: AbortSignal): Promise<Wallet[]> => request({ url: '/wallets', signal }, WalletListSchema),

  create: (input: WalletInput): Promise<Wallet> =>
    request({ url: '/wallets', method: 'POST', data: input }, WalletSchema),

  update: (id: string, input: WalletInput): Promise<Wallet> =>
    request({ url: path(id), method: 'PATCH', data: input }, WalletSchema),

  /** Simula a conexão na extensão: 409 `CONFLICT` quando a carteira recusa. */
  connect: (id: string): Promise<Wallet> =>
    request({ url: `${path(id)}/connect`, method: 'POST' }, WalletSchema),

  disconnect: (id: string): Promise<Wallet> =>
    request({ url: `${path(id)}/disconnect`, method: 'POST' }, WalletSchema),
};
