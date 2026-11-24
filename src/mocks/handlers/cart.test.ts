import axios from 'axios';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { CartSchema, MergeCartResponseSchema } from '@/contracts';
import { toApiError } from '@/shared/api/api-error';

import { db } from '../db/store';
import { resetNetworkState } from '../network/with-network';
import { server } from '../node';

const client = axios.create({ baseURL: '/api' });
const PASSWORD = 'Kurio@2026';
const IVORY = 'nft-ivory-baron-088';
const IVORY_1_10 = `${IVORY}-1-10`; // 5 disponíveis, 3.58 ETH
const IVORY_1_50 = `${IVORY}-1-50`; // 40 disponíveis, 1.79 ETH
const GOLDEN = 'nft-golden-beat-207';
const GOLDEN_1_1 = `${GOLDEN}-1-1`; // esgotada

const guest = (id: string) => ({ headers: { 'X-Guest-Cart': id } });
const user = (token: string, guestId = 'guest-x') => ({
  headers: { Authorization: `Bearer ${token}`, 'X-Guest-Cart': guestId },
});

async function tokenFor(email: string): Promise<string> {
  const res = await client.post('/auth/login', { email, password: PASSWORD });
  return (res.data as { token: string }).token;
}

const parseCart = (data: unknown) => CartSchema.parse(data);

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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  db.reset('default');
  resetNetworkState();
});
afterEach(() => server.resetHandlers());

describe('carrinho de visitante', () => {
  test('começa vazio; adicionar devolve o carrinho com dados da edição e do NFT', async () => {
    expect(parseCart((await client.get('/cart', guest('g1'))).data).items).toEqual([]);

    const cart = parseCart(
      (await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_10, quantity: 2 }, guest('g1')))
        .data,
    );
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({
      nftId: IVORY,
      editionId: IVORY_1_10,
      editionLabel: '1/10',
      quantity: 2,
      unitPrice: '3.58',
      available: 5,
      nft: { name: 'Ivory Baron #088' },
    });
  });

  test('mesmo (nftId, editionId) soma; outra edição vira outra linha', async () => {
    await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_10, quantity: 2 }, guest('g1'));
    await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_10, quantity: 1 }, guest('g1'));
    const cart = parseCart(
      (await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_50, quantity: 1 }, guest('g1')))
        .data,
    );
    expect(cart.items.map((i) => [i.editionId, i.quantity])).toEqual([
      [IVORY_1_10, 3],
      [IVORY_1_50, 1],
    ]);
  });

  test('acima do disponível → 409 AVAILABILITY_CONFLICT com details.available, sem alterar', async () => {
    await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_10, quantity: 4 }, guest('g1'));
    const error = await expectError(
      client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_10, quantity: 2 }, guest('g1')),
      409,
      'AVAILABILITY_CONFLICT',
    );
    expect(error.details).toMatchObject({ available: 5 });
    await expectError(
      client.post('/cart/items', { nftId: GOLDEN, editionId: GOLDEN_1_1, quantity: 1 }, guest('g1')),
      409,
      'AVAILABILITY_CONFLICT',
    );
    expect(parseCart((await client.get('/cart', guest('g1'))).data).items[0]?.quantity).toBe(4);
  });

  test('PATCH altera a quantidade (com o mesmo limite) e DELETE remove a linha', async () => {
    const added = parseCart(
      (await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_10, quantity: 1 }, guest('g1')))
        .data,
    );
    const itemId = added.items[0]!.id;

    const patched = parseCart(
      (await client.patch(`/cart/items/${itemId}`, { quantity: 5 }, guest('g1'))).data,
    );
    expect(patched.items[0]?.quantity).toBe(5);
    await expectError(
      client.patch(`/cart/items/${itemId}`, { quantity: 6 }, guest('g1')),
      409,
      'AVAILABILITY_CONFLICT',
    );
    await expectError(
      client.patch(`/cart/items/${itemId}`, { quantity: 0 }, guest('g1')),
      422,
      'VALIDATION_ERROR',
    );

    const removed = parseCart((await client.delete(`/cart/items/${itemId}`, guest('g1'))).data);
    expect(removed.items).toEqual([]);
    await expectError(client.delete(`/cart/items/${itemId}`, guest('g1')), 404, 'NOT_FOUND');
  });

  test('carrinhos de visitantes diferentes não se misturam; sem identificação → 400', async () => {
    await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_10, quantity: 1 }, guest('g1'));
    expect(parseCart((await client.get('/cart', guest('g2'))).data).items).toEqual([]);
    await expectError(client.get('/cart'), 400, 'VALIDATION_ERROR');
  });

  test('NFT ou edição inexistente → 404', async () => {
    await expectError(
      client.post('/cart/items', { nftId: 'nao-existe', editionId: 'x', quantity: 1 }, guest('g1')),
      404,
      'NOT_FOUND',
    );
    await expectError(
      client.post('/cart/items', { nftId: IVORY, editionId: 'x', quantity: 1 }, guest('g1')),
      404,
      'NOT_FOUND',
    );
  });
});

describe('carrinho do usuário e merge', () => {
  test('logado usa o carrinho do usuário (ignora o do visitante); token inválido → 401', async () => {
    await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_10, quantity: 1 }, guest('g1'));
    const token = await tokenFor('colecionador@kurio.test');
    expect(parseCart((await client.get('/cart', user(token, 'g1'))).data).items).toEqual([]);
    await expectError(client.get('/cart', user('token-invalido', 'g1')), 401, 'UNAUTHENTICATED');
  });

  test('merge traz os itens do visitante, soma com os do usuário e limita ao disponível', async () => {
    await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_10, quantity: 4 }, guest('g1'));
    await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_50, quantity: 2 }, guest('g1'));
    const token = await tokenFor('colecionador@kurio.test');
    await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_10, quantity: 3 }, user(token));

    const merged = MergeCartResponseSchema.parse(
      (await client.post('/cart/merge', { guestCartId: 'g1' }, user(token, 'g1'))).data,
    );
    expect(merged.cart.items.map((i) => [i.editionId, i.quantity])).toEqual([
      [IVORY_1_10, 5],
      [IVORY_1_50, 2],
    ]);
    expect(merged.adjustments).toEqual([{ nftId: IVORY, editionId: IVORY_1_10, requested: 7, applied: 5 }]);

    // O carrinho de visitante foi consumido: um segundo merge não duplica nada.
    const again = MergeCartResponseSchema.parse(
      (await client.post('/cart/merge', { guestCartId: 'g1' }, user(token, 'g1'))).data,
    );
    expect(again.cart.items.map((i) => i.quantity)).toEqual([5, 2]);
    expect(again.adjustments).toEqual([]);
    expect(parseCart((await client.get('/cart', guest('g1'))).data).items).toEqual([]);
  });

  test('merge exige sessão', async () => {
    await expectError(client.post('/cart/merge', { guestCartId: 'g1' }, guest('g1')), 401, 'UNAUTHENTICATED');
  });
});
