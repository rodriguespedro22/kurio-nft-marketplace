import axios from 'axios';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { CartSchema, QuoteSchema } from '@/contracts';
import { toApiError } from '@/shared/api/api-error';

import { db } from '../db/store';
import { resetNetworkState } from '../network/with-network';
import { server } from '../node';

const client = axios.create({ baseURL: '/api' });
const guest = { headers: { 'X-Guest-Cart': 'g-quote' } };

const IVORY = 'nft-ivory-baron-088';
const IVORY_1_10 = `${IVORY}-1-10`;
const GOLDEN = 'nft-golden-beat-207';
const GOLDEN_1_50 = `${GOLDEN}-1-50`;

/** Preços redondos do enunciado do teste: 8.34 × 3 + 2.38 = 27.4. */
function setPrice(nftId: string, editionId: string, price: string) {
  db.update((d) => {
    const edition = d.nfts.find((n) => n.id === nftId)?.editions.find((e) => e.id === editionId);
    if (edition) edition.price = price;
  });
}

async function add(nftId: string, editionId: string, quantity: number) {
  await client.post('/cart/items', { nftId, editionId, quantity }, guest);
}

async function quote(network = 'ethereum') {
  return QuoteSchema.parse((await client.post('/quotes', { network }, guest)).data);
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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  db.reset('default');
  resetNetworkState();
  setPrice(IVORY, IVORY_1_10, '8.34');
  setPrice(GOLDEN, GOLDEN_1_50, '2.38');
});
afterEach(() => server.resetHandlers());

describe('POST /quotes', () => {
  test('linhas e subtotal vêm do carrinho; taxa depende da rede', async () => {
    await add(IVORY, IVORY_1_10, 3);
    await add(GOLDEN, GOLDEN_1_50, 1);

    const eth = await quote('ethereum');
    expect(eth.lines.map((l) => [l.editionId, l.quantity, l.unitPrice, l.lineTotal])).toEqual([
      [IVORY_1_10, 3, '8.34', '25.02'],
      [GOLDEN_1_50, 1, '2.38', '2.38'],
    ]);
    expect(eth).toMatchObject({
      network: 'ethereum',
      subtotal: '27.4',
      discount: '0',
      networkFee: '0.016',
      total: '27.416',
      coupon: null,
      issues: [],
    });
    expect((await quote('polygon')).networkFee).toBe('0.0004');
    expect((await quote('solana')).networkFee).toBe('0.0002');
  });

  test('KURIO10 guardado no carrinho: desconto de 10% e total 24.676 na ethereum', async () => {
    await add(IVORY, IVORY_1_10, 3);
    await add(GOLDEN, GOLDEN_1_50, 1);
    const cart = CartSchema.parse((await client.put('/cart/coupon', { code: 'kurio10' }, guest)).data);
    expect(cart.couponCode).toBe('KURIO10');

    const withCoupon = await quote();
    expect(withCoupon).toMatchObject({
      subtotal: '27.4',
      discount: '2.74',
      total: '24.676',
      coupon: { code: 'KURIO10', status: 'applied', percent: 10 },
    });

    const removed = CartSchema.parse((await client.delete('/cart/coupon', guest)).data);
    expect(removed.couponCode).toBeNull();
    expect((await quote()).total).toBe('27.416');
  });

  test('cupom expirado → 422 COUPON_EXPIRED; desconhecido → 422 COUPON_INVALID (no campo code)', async () => {
    await add(IVORY, IVORY_1_10, 1);
    const expired = await expectError(
      client.put('/cart/coupon', { code: 'EXPIRADO10' }, guest),
      422,
      'COUPON_EXPIRED',
    );
    expect(expired.fields).toEqual({ code: 'Cupom expirado' });
    const invalid = await expectError(
      client.put('/cart/coupon', { code: 'XYZ' }, guest),
      422,
      'COUPON_INVALID',
    );
    expect(invalid.fields).toEqual({ code: 'Cupom inválido' });
    expect((await quote()).coupon).toBeNull();
  });

  test('cenário coupon-invalid recusa até o KURIO10', async () => {
    db.reset('coupon-invalid');
    await add(IVORY, IVORY_1_10, 1);
    await expectError(client.put('/cart/coupon', { code: 'KURIO10' }, guest), 422, 'COUPON_INVALID');
  });

  test('quantidade acima do disponível gera issue "insufficient"; esgotado gera "sold_out"', async () => {
    await add(IVORY, IVORY_1_10, 4);
    await add(GOLDEN, GOLDEN_1_50, 2);
    db.update((d) => {
      const ivory = d.nfts.find((n) => n.id === IVORY)!.editions.find((e) => e.id === IVORY_1_10)!;
      ivory.available = 2;
      const golden = d.nfts.find((n) => n.id === GOLDEN)!.editions.find((e) => e.id === GOLDEN_1_50)!;
      golden.available = 0;
    });
    const cart = CartSchema.parse((await client.get('/cart', guest)).data);
    const [ivoryLine, goldenLine] = cart.items;

    expect((await quote()).issues).toEqual([
      { cartItemId: ivoryLine!.id, kind: 'insufficient', requested: 4, available: 2 },
      { cartItemId: goldenLine!.id, kind: 'sold_out' },
    ]);
  });

  test('a cotação fica guardada com o snapshot de preços e uma versão por carrinho', async () => {
    await add(IVORY, IVORY_1_10, 1);
    const first = await quote();
    const second = await quote();
    expect(second.version).toBe(first.version + 1);
    expect(db.get().quotes[first.quoteId]).toMatchObject({ subtotal: '8.34', lines: first.lines });
    expect(Date.parse(first.expiresAt)).toBeGreaterThan(Date.now());
  });

  test('carrinho vazio → tudo zero, sem taxa', async () => {
    expect(await quote()).toMatchObject({ lines: [], subtotal: '0', networkFee: '0', total: '0' });
  });

  test('rede inválida → 422', async () => {
    await expectError(client.post('/quotes', { network: 'bitcoin' }, guest), 422, 'VALIDATION_ERROR');
  });
});
