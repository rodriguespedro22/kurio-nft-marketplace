import axios from 'axios';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { WalletListSchema, WalletSchema, type WalletInput } from '@/contracts';
import { toApiError } from '@/shared/api/api-error';

import { db } from '../db/store';
import { resetNetworkState } from '../network/with-network';
import { server } from '../node';

const client = axios.create({ baseURL: '/api' });
const PASSWORD = 'Kurio@2026';
const ADDRESS = `0x${'1a'.repeat(20)}`;
/** Endereço da principal do colecionador nas fixtures. */
const SEED_ADDRESS = '0xA91F6c3B9e2D4f5A8b7C1d0E9f8A7b6C5d4EE82C';

async function tokenFor(email: string): Promise<string> {
  const res = await client.post('/auth/login', { email, password: PASSWORD });
  return (res.data as { token: string }).token;
}

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

async function wallets(token: string) {
  return WalletListSchema.parse((await client.get('/wallets', auth(token))).data);
}

async function expectError(promise: Promise<unknown>, status: number, code: string) {
  try {
    await promise;
    throw new Error('deveria falhar');
  } catch (error) {
    const apiError = toApiError(error);
    expect(apiError).toMatchObject({ status, code });
    return apiError;
  }
}

function input(overrides: Partial<WalletInput> = {}): WalletInput {
  return {
    slot: 'primary',
    displayName: 'Ana Ribeiro',
    label: 'Principal',
    network: 'ethereum',
    profileName: 'Coleção da Ana',
    address: ADDRESS,
    secondaryAddressOrEns: '',
    provider: 'metamask',
    referralCode: 'KURIO-2026',
    email: 'ana@kurio.test',
    ensName: 'ana.eth',
    ...overrides,
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  db.reset('default');
  resetNetworkState();
});
afterEach(() => server.resetHandlers());

describe('carteiras', () => {
  test('GET lista só as do usuário: colecionador nasce com a principal, Ana sem nenhuma', async () => {
    const colecionador = await wallets(await tokenFor('colecionador@kurio.test'));
    expect(colecionador.map((w) => [w.slot, w.connection])).toEqual([['primary', 'connected']]);
    expect(await wallets(await tokenFor('ana@kurio.test'))).toEqual([]);
    await expectError(client.get('/wallets'), 401, 'UNAUTHENTICATED');
  });

  test('POST valida (endereço da rede, ENS) e cria o slot desconectado; slot repetido → 409', async () => {
    const token = await tokenFor('ana@kurio.test');

    const invalid = await expectError(
      client.post('/wallets', input({ address: '0x123', ensName: 'ana' }), auth(token)),
      422,
      'VALIDATION_ERROR',
    );
    expect(invalid.fields).toMatchObject({
      address: 'Endereço inválido para a rede selecionada',
      ensName: 'Use um nome ENS válido, ex.: colecionador.eth',
    });

    const created = WalletSchema.parse((await client.post('/wallets', input(), auth(token))).data);
    expect(created).toMatchObject({
      slot: 'primary',
      connection: 'disconnected',
      secondaryAddressOrEns: null,
    });

    await expectError(client.post('/wallets', input({ label: 'Outra' }), auth(token)), 409, 'CONFLICT');
    const secondary = await client.post(
      '/wallets',
      input({ slot: 'secondary', label: 'Reserva' }),
      auth(token),
    );
    expect(secondary.status).toBe(201);
    expect((await wallets(token)).map((w) => w.slot)).toEqual(['primary', 'secondary']);
  });

  test('PATCH edita; trocar endereço, rede ou tipo desconecta; carteira de outro usuário → 403', async () => {
    const token = await tokenFor('colecionador@kurio.test');

    const renamed = WalletSchema.parse(
      (await client.patch('/wallets/wallet-1', input({ label: 'Cofre', address: SEED_ADDRESS }), auth(token)))
        .data,
    );
    expect(renamed).toMatchObject({ label: 'Cofre', connection: 'connected', displayName: 'Ana Ribeiro' });

    const switched = WalletSchema.parse(
      (
        await client.patch(
          '/wallets/wallet-1',
          input({ label: 'Cofre', address: SEED_ADDRESS, provider: 'coinbase' }),
          auth(token),
        )
      ).data,
    );
    expect(switched.connection).toBe('disconnected');

    await expectError(
      client.patch('/wallets/wallet-1', input(), auth(await tokenFor('ana@kurio.test'))),
      403,
      'FORBIDDEN',
    );
    await expectError(
      client.post('/wallets/wallet-1/connect', null, auth(await tokenFor('ana@kurio.test'))),
      403,
      'FORBIDDEN',
    );
    await expectError(client.patch('/wallets/wallet-nao-existe', input(), auth(token)), 404, 'NOT_FOUND');
  });

  test('conectar: MetaMask conecta; WalletConnect recusa (409) e fica "declined"; desconectar', async () => {
    const token = await tokenFor('colecionador@kurio.test');
    await client.post('/wallets/wallet-1/disconnect', null, auth(token));

    const connected = WalletSchema.parse(
      (await client.post('/wallets/wallet-1/connect', null, auth(token))).data,
    );
    expect(connected.connection).toBe('connected');

    await client.patch('/wallets/wallet-1', input({ provider: 'walletconnect' }), auth(token));
    const declined = await expectError(
      client.post('/wallets/wallet-1/connect', null, auth(token)),
      409,
      'CONFLICT',
    );
    expect(declined.message).toBe('Conexão recusada na carteira');
    expect((await wallets(token))[0]!.connection).toBe('declined');

    const disconnected = WalletSchema.parse(
      (await client.post('/wallets/wallet-1/disconnect', null, auth(token))).data,
    );
    expect(disconnected.connection).toBe('disconnected');
  });

  test('cenário payment-declined: a carteira recusa conexão mesmo com MetaMask', async () => {
    db.reset('payment-declined');
    const token = await tokenFor('colecionador@kurio.test');
    await expectError(client.post('/wallets/wallet-1/connect', null, auth(token)), 409, 'CONFLICT');
    expect((await wallets(token))[0]!.connection).toBe('declined');
  });
});
