import axios from 'axios';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import {
  OrderSchema,
  QuoteSchema,
  TransactionSchema,
  type Buyer,
  type CreateOrderInput,
  type Order,
} from '@/contracts';
import { toApiError } from '@/shared/api/api-error';

import { db } from '../db/store';
import { resetNetworkState } from '../network/with-network';
import { server } from '../node';
import { clearOrderTimers, resolveOrder } from './orders';

const client = axios.create({ baseURL: '/api' });
const PASSWORD = 'Kurio@2026';
const IVORY = 'nft-ivory-baron-088';
const IVORY_1_10 = `${IVORY}-1-10`;

const BUYER: Buyer = {
  displayName: 'Colecionador Kurio',
  username: 'colecionador',
  network: 'ethereum',
  profileName: 'Coleção Principal',
  walletAddress: '0xA91F6c3B9e2D4f5A8b7C1d0E9f8A7b6C5d4EE82C',
  secondaryWalletOrEns: '',
  walletType: 'metamask',
  referralCode: 'KURIO-2026',
  email: 'colecionador@kurio.test',
  ensName: 'colecionador.eth',
  useOtherWallet: false,
  notes: '',
};

let token = '';
const auth = (extra: Record<string, string> = {}) => ({
  headers: { Authorization: `Bearer ${token}`, ...extra },
});

async function login(email = 'colecionador@kurio.test') {
  const res = await client.post('/auth/login', { email, password: PASSWORD });
  token = (res.data as { token: string }).token;
}

async function addToCart(quantity: number) {
  await client.post('/cart/items', { nftId: IVORY, editionId: IVORY_1_10, quantity }, auth());
}

async function orderInput(): Promise<CreateOrderInput> {
  const quote = QuoteSchema.parse((await client.post('/quotes', { network: 'ethereum' }, auth())).data);
  return {
    quoteId: quote.quoteId,
    quoteVersion: quote.version,
    walletId: 'wallet-1',
    network: 'ethereum',
    buyer: BUYER,
  };
}

function createOrder(input: CreateOrderInput, key: string | null) {
  return client.post('/orders', input, auth(key ? { 'Idempotency-Key': key } : {}));
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

const edition = () =>
  db
    .get()
    .nfts.find((n) => n.id === IVORY)!
    .editions.find((e) => e.id === IVORY_1_10)!;
const cartQuantity = async () =>
  ((await client.get('/cart', auth())).data as { items: { quantity: number }[] }).items.map(
    (i) => i.quantity,
  );

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(async () => {
  db.reset('default');
  resetNetworkState();
  await login();
});
afterEach(() => {
  clearOrderTimers();
  server.resetHandlers();
});

describe('POST /orders', () => {
  test('sem Idempotency-Key → 400', async () => {
    await addToCart(1);
    await expectError(createOrder(await orderInput(), null), 400, 'BAD_REQUEST');
  });

  test('mesma chave e mesmo corpo → o mesmo pedido, marcado como replay; um pedido só', async () => {
    await addToCart(2);
    const input = await orderInput();

    const first = await createOrder(input, 'key-1');
    expect(first.status).toBe(201);
    const order = OrderSchema.parse(first.data);
    expect(order).toMatchObject({ status: 'pending', txHash: null });
    expect(order.snapshot.lines).toMatchObject([
      { editionId: IVORY_1_10, quantity: 2, name: 'Ivory Baron #088' },
    ]);

    const replay = await createOrder(input, 'key-1');
    expect(replay.status).toBe(200);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect((replay.data as Order).id).toBe(order.id);
    expect(Object.keys(db.get().orders)).toHaveLength(1);
  });

  test('mesma chave com corpo diferente → 409 IDEMPOTENCY_CONFLICT', async () => {
    await addToCart(1);
    const input = await orderInput();
    await createOrder(input, 'key-1');
    await expectError(
      createOrder({ ...input, buyer: { ...input.buyer, notes: 'outro' } }, 'key-1'),
      409,
      'IDEMPOTENCY_CONFLICT',
    );
  });

  test('preço mudou depois da cotação → 409 QUOTE_STALE com a cotação nova', async () => {
    await addToCart(1);
    const input = await orderInput();
    db.update((d) => {
      d.nfts.find((n) => n.id === IVORY)!.editions.find((e) => e.id === IVORY_1_10)!.price = '9.99';
    });

    const error = await expectError(createOrder(input, 'key-1'), 409, 'QUOTE_STALE');
    const fresh = QuoteSchema.parse((error.details as { quote: unknown }).quote);
    expect(fresh.quoteId).not.toBe(input.quoteId);
    expect(fresh.lines[0]?.unitPrice).toBe('9.99');
    expect(Object.keys(db.get().orders)).toHaveLength(0);
  });

  test('price-change-during-checkout: o 1º envio encontra o preço mudado (QUOTE_STALE); o 2º passa', async () => {
    db.reset('price-change-during-checkout');
    await login();
    await addToCart(1);
    const input = await orderInput();
    const before = edition().price;

    const error = await expectError(createOrder(input, 'key-1'), 409, 'QUOTE_STALE');
    const fresh = QuoteSchema.parse((error.details as { quote: unknown }).quote);
    expect(fresh.lines[0]?.unitPrice).not.toBe(before);
    expect(db.get().meta.firstCheckoutQuoteHandled).toBe(true);

    const retry = { ...input, quoteId: fresh.quoteId, quoteVersion: fresh.version };
    expect((await createOrder(retry, 'key-2')).status).toBe(201);
  });

  test('sold-out-during-checkout: o 1º item esgota no 1º envio e a cotação nova traz a issue', async () => {
    db.reset('sold-out-during-checkout');
    await login();
    await addToCart(1);

    const error = await expectError(createOrder(await orderInput(), 'key-1'), 409, 'QUOTE_STALE');
    const fresh = QuoteSchema.parse((error.details as { quote: unknown }).quote);
    expect(fresh.issues).toEqual([{ cartItemId: fresh.lines[0]?.cartItemId, kind: 'sold_out' }]);
    expect(edition().available).toBe(0);
  });

  test('pedido de outro usuário → 403, sem expor o pedido; inexistente → 404', async () => {
    await addToCart(1);
    const order = (await createOrder(await orderInput(), 'key-1')).data as Order;
    await login('ana@kurio.test');
    const denied = await expectError(client.get(`/orders/${order.id}`, auth()), 403, 'FORBIDDEN');
    expect(JSON.stringify(denied)).not.toContain(order.snapshot.total);
    await expectError(client.get('/orders/order-nao-existe', auth()), 404, 'NOT_FOUND');
  });
});

describe('resolução do pedido', () => {
  test('confirmado: baixa o estoque, tira do carrinho só o comprado e grava o txHash', async () => {
    await addToCart(2);
    const before = edition().available;
    const order = (await createOrder(await orderInput(), 'key-1')).data as Order;
    await addToCart(1); // adicionada depois da cotação: fica no carrinho

    await resolveOrder(order.id);

    const resolved = OrderSchema.parse((await client.get(`/orders/${order.id}`, auth())).data);
    expect(resolved.status).toBe('confirmed');
    expect(resolved.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(resolved.explorerUrl).toBe(`/explorador/tx/${resolved.txHash}`);
    expect(resolved.version).toBeGreaterThan(order.version);
    expect(edition().available).toBe(before - 2);
    expect(await cartQuantity()).toEqual([1]);
  });

  test('recusado (payment-declined): motivo gravado, carrinho e estoque intactos', async () => {
    db.reset('payment-declined');
    await login();
    await addToCart(2);
    const before = edition().available;
    const order = (await createOrder(await orderInput(), 'key-1')).data as Order;

    await resolveOrder(order.id);

    const resolved = OrderSchema.parse((await client.get(`/orders/${order.id}`, auth())).data);
    expect(resolved).toMatchObject({ status: 'rejected', txHash: null });
    expect(resolved.rejectionReason).toMatch(/recusado/i);
    expect(edition().available).toBe(before);
    expect(await cartQuantity()).toEqual([2]);
  });
});

describe('GET /explorer/tx/:hash', () => {
  test('pedido confirmado: transação pública com os valores do snapshot, sem dados do comprador', async () => {
    await addToCart(2);
    const order = (await createOrder(await orderInput(), 'key-1')).data as Order;
    await resolveOrder(order.id);
    const { txHash, snapshot } = OrderSchema.parse((await client.get(`/orders/${order.id}`, auth())).data);

    const res = await client.get(`/explorer/tx/${txHash}`); // sem token: é público
    const tx = TransactionSchema.parse(res.data);
    expect(tx).toMatchObject({ hash: txHash, status: 'confirmed', network: 'ethereum', tokens: 2 });
    expect(tx.value).toBe(snapshot.total);
    expect(tx.networkFee).toBe(snapshot.networkFee);
    expect(Object.keys(res.data as object)).not.toContain('walletAddress');
    // Determinístico: a mesma transação, o mesmo bloco.
    expect((await client.get(`/explorer/tx/${txHash}`)).data).toEqual(res.data);
  });

  test('hash desconhecido ou pedido ainda pendente → 404', async () => {
    await expectError(client.get('/explorer/tx/0xdeadbeef'), 404, 'NOT_FOUND');
    await addToCart(1);
    await createOrder(await orderInput(), 'key-1');
    const pendingHash = Object.values(db.get().orders)[0]!.txHash;
    expect(pendingHash).toBeNull();
  });
});
