import axios from 'axios';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import {
  CatalogFacetsSchema,
  CategoryListSchema,
  NftPageSchema,
  NftSchema,
  type NftListItem,
} from '@/contracts';
import { toApiError } from '@/shared/api/api-error';
import { cmpEth } from '@/shared/money/eth';

import { db } from '../db/store';
import { resetNetworkState } from '../network/with-network';
import { server } from '../node';

const client = axios.create({ baseURL: '/api', paramsSerializer: { indexes: null } });

async function page(params: Record<string, unknown>) {
  const res = await client.get('/nfts', { params });
  return NftPageSchema.parse(res.data);
}

const ids = (items: NftListItem[]) => items.map((i) => i.id);
const byId = () => new Map(db.get().nfts.map((n) => [n.id, n]));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  db.reset('default');
  resetNetworkState();
});
afterEach(() => server.resetHandlers());

describe('GET /nfts — busca e filtros', () => {
  test('q casa nome, coleção ou criador sem diferenciar caixa nem acento', async () => {
    const result = await page({ q: 'baron', pageSize: 48 });
    expect(ids(result.items)).toContain('nft-ivory-baron-088');
    const nfts = byId();
    for (const item of result.items) {
      const nft = nfts.get(item.id);
      expect(`${nft?.name} ${nft?.collection} ${nft?.creator}`.toLowerCase()).toContain('baron');
    }

    const accented = await page({ q: '  BÁRON ', pageSize: 48 });
    expect(ids(accented.items)).toEqual(ids(result.items));

    const byCreator = await page({ q: 'nova sato', pageSize: 48 });
    expect(byCreator.items.length).toBeGreaterThan(0);
    for (const item of byCreator.items) expect(nfts.get(item.id)?.creator).toBe('Nova Sato');
  });

  test('categorias são OR entre si e AND com os demais filtros', async () => {
    const wanted = ['arte-digital', 'musica'];
    const expected = db.get().nfts.filter((n) => wanted.includes(n.category));
    const result = await page({ category: wanted, pageSize: 48 });
    expect(result.total).toBe(expected.length);
    expect(new Set(result.items.map((i) => i.category))).toEqual(new Set(wanted));

    const narrowed = await page({ category: wanted, network: ['polygon'], pageSize: 48 });
    expect(narrowed.total).toBe(expected.filter((n) => n.network === 'polygon').length);
    expect(narrowed.total).toBeLessThan(result.total);
    for (const item of narrowed.items) {
      expect(item.network).toBe('polygon');
      expect(wanted).toContain(item.category);
    }
  });

  test('aceita também a forma category[]=… na query', async () => {
    const res = await client.get('/nfts?category[]=musica&pageSize=48');
    const parsed = NftPageSchema.parse(res.data);
    expect(parsed.total).toBe(db.get().nfts.filter((n) => n.category === 'musica').length);
  });

  test('faixa de preço usa o menor preço DISPONÍVEL (edição esgotada não conta)', async () => {
    // Golden Beat #207: 1/1 esgotada (3.96) e 1/50 disponível (0.99).
    const cheap = await page({ minPrice: '0.99', maxPrice: '0.99', pageSize: 48 });
    expect(ids(cheap.items)).toContain('nft-golden-beat-207');
    const item = cheap.items.find((i) => i.id === 'nft-golden-beat-207');
    expect(item?.price).toBe('0.99');

    const soldOutPrice = await page({ minPrice: '3.9', maxPrice: '4', pageSize: 48 });
    expect(ids(soldOutPrice.items)).not.toContain('nft-golden-beat-207');

    for (const i of cheap.items) expect(cmpEth(i.price, '0.99')).toBe(0);
  });

  test('edição filtra por tipo existente no NFT', async () => {
    const result = await page({ edition: 'open', pageSize: 48 });
    const nfts = byId();
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(nfts.get(item.id)?.editions.some((e) => e.kind === 'open')).toBe(true);
    }
  });

  test('parâmetro inválido → 422 VALIDATION_ERROR', async () => {
    try {
      await client.get('/nfts', { params: { sort: 'popular' } });
      throw new Error('deveria falhar');
    } catch (error) {
      expect(toApiError(error)).toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    }
  });
});

describe('GET /nfts — ordenação, abas e paginação', () => {
  test('sort=price_asc é estável: preço crescente e desempate por id', async () => {
    const { items } = await page({ sort: 'price_asc', pageSize: 48 });
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1]!;
      const cur = items[i]!;
      const order = cmpEth(prev.price, cur.price);
      expect(order).toBeLessThanOrEqual(0);
      if (order === 0) expect(prev.id < cur.id).toBe(true);
    }
  });

  test('sort=price_desc decrescente e sort=name em ordem alfabética', async () => {
    const desc = (await page({ sort: 'price_desc', pageSize: 48 })).items;
    for (let i = 1; i < desc.length; i++)
      expect(cmpEth(desc[i - 1]!.price, desc[i]!.price)).toBeGreaterThanOrEqual(0);

    const named = (await page({ sort: 'name', pageSize: 48 })).items.map((i) => i.name);
    expect(named).toEqual([...named].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  });

  test('tab=trending ordena por trendingScore (maior primeiro)', async () => {
    const { items } = await page({ tab: 'trending', pageSize: 48 });
    const nfts = byId();
    const scores = items.map((i) => nfts.get(i.id)?.trendingScore ?? -1);
    expect(items.length).toBeGreaterThan(0);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  test('padrão: mais recentes primeiro', async () => {
    const { items } = await page({ pageSize: 48 });
    const nfts = byId();
    const dates = items.map((i) => nfts.get(i.id)?.listedAt ?? '');
    expect(dates).toEqual([...dates].sort().reverse());
  });

  test('pageSize 9 por padrão; página além do total → items [] com totalPages correto', async () => {
    const first = await page({});
    expect(first).toMatchObject({ page: 1, pageSize: 9, total: 60, totalPages: 7 });
    expect(first.items).toHaveLength(9);

    const beyond = await page({ page: 99 });
    expect(beyond).toMatchObject({ page: 99, pageSize: 9, total: 60, totalPages: 7, items: [] });
  });

  test('itens de lista trazem imagem principal e preço de vitrine', async () => {
    const { items } = await page({ q: 'emerald ape' });
    const emerald = items.find((i) => i.id === 'nft-emerald-ape-042');
    expect(emerald).toMatchObject({ price: '1.19', isRare: false, network: 'ethereum' });
    expect(emerald?.image.asset).toMatch(/^ape-/);
  });
});

describe('detalhe, destaques e categorias', () => {
  test('GET /nfts/:id devolve o NFT completo; inexistente → 404 NOT_FOUND', async () => {
    const res = await client.get('/nfts/nft-ivory-baron-088');
    expect(NftSchema.parse(res.data).name).toBe('Ivory Baron #088');

    try {
      await client.get('/nfts/inexistente');
      throw new Error('deveria falhar');
    } catch (error) {
      expect(toApiError(error)).toMatchObject({ status: 404, code: 'NOT_FOUND' });
    }
  });

  test('GET /nfts/featured devolve 3 itens de lista', async () => {
    const res = await client.get('/nfts/featured');
    expect(res.data).toHaveLength(3);
    expect(NftPageSchema.shape.items.parse(res.data)).toHaveLength(3);
  });

  test('GET /catalog/facets conta por rede e traz a faixa de preço de vitrine', async () => {
    const facets = CatalogFacetsSchema.parse((await client.get('/catalog/facets')).data);
    expect(facets.networks.map((n) => n.id)).toEqual(['ethereum', 'polygon', 'solana']);
    expect(facets.networks.map((n) => n.count)).toEqual([23, 23, 14]);
    expect(facets.priceRange).not.toBeNull();
    expect(cmpEth(facets.priceRange!.min, facets.priceRange!.max)).toBe(-1);

    await client.post('/__mock/reset', { scenario: 'empty-catalog' });
    const empty = CatalogFacetsSchema.parse((await client.get('/catalog/facets')).data);
    expect(empty.priceRange).toBeNull();
    expect(empty.networks.every((n) => n.count === 0)).toBe(true);
  });

  test('GET /categories conta só os NFTs existentes', async () => {
    const all = CategoryListSchema.parse((await client.get('/categories')).data);
    expect(all).toHaveLength(9);
    expect(all.reduce((sum, c) => sum + c.count, 0)).toBe(60);

    db.update((d) => {
      d.nfts = d.nfts.filter((n) => n.category !== 'musica');
    });
    const after = CategoryListSchema.parse((await client.get('/categories')).data);
    expect(after.find((c) => c.id === 'musica')?.count).toBe(0);

    await client.post('/__mock/reset', { scenario: 'empty-catalog' });
    const empty = CategoryListSchema.parse((await client.get('/categories')).data);
    expect(empty.every((c) => c.count === 0)).toBe(true);
  });
});
