import axios from 'axios';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { FavoritesSchema, FavoriteToggleResponseSchema } from '@/contracts';
import { toApiError } from '@/shared/api/api-error';

import { db } from '../db/store';
import { resetNetworkState } from '../network/with-network';
import { server } from '../node';

const client = axios.create({ baseURL: '/api' });
const PASSWORD = 'Kurio@2026';

async function tokenFor(email: string): Promise<string> {
  const res = await client.post('/auth/login', { email, password: PASSWORD });
  return (res.data as { token: string }).token;
}

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

async function favorites(token: string) {
  return FavoritesSchema.parse((await client.get('/favorites', auth(token))).data);
}

async function expectError(promise: Promise<unknown>, status: number, code: string) {
  try {
    await promise;
    throw new Error('deveria falhar');
  } catch (error) {
    expect(toApiError(error)).toMatchObject({ status, code });
  }
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  db.reset('default');
  resetNetworkState();
});
afterEach(() => server.resetHandlers());

describe('favoritos', () => {
  test('PUT adiciona, é idempotente, e GET devolve itens de lista', async () => {
    const token = await tokenFor('colecionador@kurio.test');
    expect((await favorites(token)).items).toEqual([]);

    const put = FavoriteToggleResponseSchema.parse(
      (await client.put('/favorites/nft-ivory-baron-088', null, auth(token))).data,
    );
    expect(put).toEqual({ nftId: 'nft-ivory-baron-088', favorited: true });
    await client.put('/favorites/nft-ivory-baron-088', null, auth(token));

    const list = await favorites(token);
    expect(list.items.map((i) => i.id)).toEqual(['nft-ivory-baron-088']);
    expect(list.items[0]).toMatchObject({ name: 'Ivory Baron #088', price: '1.79' });
  });

  test('DELETE remove (idempotente) e o mais recente vem primeiro', async () => {
    const token = await tokenFor('colecionador@kurio.test');
    await client.put('/favorites/nft-ivory-baron-088', null, auth(token));
    await client.put('/favorites/nft-golden-beat-207', null, auth(token));
    expect((await favorites(token)).items.map((i) => i.id)).toEqual([
      'nft-golden-beat-207',
      'nft-ivory-baron-088',
    ]);

    const del = FavoriteToggleResponseSchema.parse(
      (await client.delete('/favorites/nft-golden-beat-207', auth(token))).data,
    );
    expect(del).toEqual({ nftId: 'nft-golden-beat-207', favorited: false });
    await client.delete('/favorites/nft-golden-beat-207', auth(token));
    expect((await favorites(token)).items.map((i) => i.id)).toEqual(['nft-ivory-baron-088']);
  });

  test('cada usuário tem os seus favoritos', async () => {
    const a = await tokenFor('colecionador@kurio.test');
    const b = await tokenFor('ana@kurio.test');
    await client.put('/favorites/nft-ivory-baron-088', null, auth(a));
    expect((await favorites(b)).items).toEqual([]);
  });

  test('sem sessão → 401; NFT inexistente → 404', async () => {
    await expectError(client.get('/favorites'), 401, 'UNAUTHENTICATED');
    await expectError(client.put('/favorites/nft-ivory-baron-088'), 401, 'UNAUTHENTICATED');
    const token = await tokenFor('colecionador@kurio.test');
    await expectError(client.put('/favorites/nao-existe', null, auth(token)), 404, 'NOT_FOUND');
  });

  test('NFT removido do catálogo some da lista sem quebrar', async () => {
    const token = await tokenFor('colecionador@kurio.test');
    await client.put('/favorites/nft-ivory-baron-088', null, auth(token));
    db.update((d) => {
      d.nfts = d.nfts.filter((n) => n.id !== 'nft-ivory-baron-088');
    });
    expect((await favorites(token)).items).toEqual([]);
  });
});
