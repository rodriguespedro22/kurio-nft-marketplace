import { http, HttpResponse } from 'msw';

import { WalletInputSchema, type Wallet, type WalletInput, type WalletSlot } from '@/contracts';

import { nextId } from '../db/ids';
import type { WalletRecord } from '../db/schema';
import { db } from '../db/store';
import { withNetwork } from '../network/with-network';
import { getScenario } from '../scenarios';
import { apiError, apiPath, readJson, validationError } from './http';
import { authenticate } from './session';

const SLOT_ORDER: Record<WalletSlot, number> = { primary: 0, secondary: 1 };
const SLOT_NAME: Record<WalletSlot, string> = { primary: 'principal', secondary: 'secundária' };
export const WALLET_DECLINED_MESSAGE = 'Conexão recusada na carteira';

function toWallet({ userId: _owner, ...wallet }: WalletRecord): Wallet {
  return wallet;
}

/** Campos editáveis vindos do formulário (ENS secundário vazio → `null`). */
function fieldsOf({ slot: _slot, ...input }: WalletInput) {
  return { ...input, secondaryAddressOrEns: input.secondaryAddressOrEns || null };
}

function findOwned(userId: string, id: string): WalletRecord | undefined {
  return db.get().wallets.find((w) => w.id === id && w.userId === userId);
}

const notFound = () => apiError(404, 'NOT_FOUND', 'Carteira não encontrada.');

/** Atualiza a carteira do usuário dentro de `db.update` e devolve a versão gravada. */
function updateWallet(userId: string, id: string, change: (w: WalletRecord) => void): Wallet {
  let saved!: Wallet;
  db.update((d) => {
    const wallet = d.wallets.find((w) => w.id === id && w.userId === userId)!;
    change(wallet);
    saved = toWallet(wallet);
  });
  return saved;
}

/**
 * Simula a extensão: WalletConnect sempre recusa (sem QR code numa demo), assim como qualquer
 * carteira no cenário `payment-declined`.
 */
const declines = (wallet: WalletRecord) =>
  wallet.provider === 'walletconnect' || getScenario().declineWalletConnect === true;

export const walletHandlers = [
  http.get(
    apiPath('/wallets'),
    withNetwork(({ request }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const list = db
        .get()
        .wallets.filter((w) => w.userId === auth.user.id)
        .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot])
        .map(toWallet);
      return HttpResponse.json(list);
    }),
  ),

  // Cada usuário tem no máximo uma carteira por slot (principal e secundária).
  http.post(
    apiPath('/wallets'),
    withNetwork(async ({ request }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const parsed = WalletInputSchema.safeParse(await readJson(request));
      if (!parsed.success) return validationError(parsed.error);
      const { slot } = parsed.data;
      if (db.get().wallets.some((w) => w.userId === auth.user.id && w.slot === slot)) {
        return apiError(409, 'CONFLICT', `Você já tem uma carteira ${SLOT_NAME[slot]}.`);
      }

      let created!: Wallet;
      db.update((d) => {
        const record: WalletRecord = {
          id: nextId(d, 'wallet'),
          userId: auth.user.id,
          slot,
          connection: 'disconnected',
          ...fieldsOf(parsed.data),
        };
        d.wallets.push(record);
        created = toWallet(record);
      });
      return HttpResponse.json(created, { status: 201 });
    }),
  ),

  // Trocar endereço, rede ou tipo de carteira desfaz a conexão: é outra carteira para a extensão.
  http.patch(
    apiPath('/wallets/:id'),
    withNetwork(async ({ request, params }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const id = String(params.id);
      const current = findOwned(auth.user.id, id);
      if (!current) return notFound();
      const parsed = WalletInputSchema.safeParse(await readJson(request));
      if (!parsed.success) return validationError(parsed.error);

      const fields = fieldsOf(parsed.data);
      const rewired =
        fields.address !== current.address ||
        fields.network !== current.network ||
        fields.provider !== current.provider;
      return HttpResponse.json(
        updateWallet(auth.user.id, id, (w) => {
          Object.assign(w, fields);
          if (rewired) w.connection = 'disconnected';
        }),
      );
    }),
  ),

  http.post(
    apiPath('/wallets/:id/connect'),
    withNetwork(({ request, params }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const id = String(params.id);
      const current = findOwned(auth.user.id, id);
      if (!current) return notFound();
      if (declines(current)) {
        updateWallet(auth.user.id, id, (w) => {
          w.connection = 'declined';
        });
        return apiError(409, 'CONFLICT', WALLET_DECLINED_MESSAGE);
      }
      return HttpResponse.json(
        updateWallet(auth.user.id, id, (w) => {
          w.connection = 'connected';
        }),
      );
    }),
  ),

  http.post(
    apiPath('/wallets/:id/disconnect'),
    withNetwork(({ request, params }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const id = String(params.id);
      if (!findOwned(auth.user.id, id)) return notFound();
      return HttpResponse.json(
        updateWallet(auth.user.id, id, (w) => {
          w.connection = 'disconnected';
        }),
      );
    }),
  ),
];
