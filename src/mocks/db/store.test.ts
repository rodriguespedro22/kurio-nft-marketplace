import { describe, expect, test } from 'vitest';

import { NftSchema } from '@/contracts';

import { buildCategories, CATEGORY_DEFINITIONS } from '../fixtures/categories';
import { getScenario, SCENARIO_NAMES } from '../scenarios';
import { hashPassword, verifyPassword } from './password';
import { createPrng } from './prng';
import { createStore, MOCK_DB_STORAGE_KEY } from './store';

describe('seed do cenário default', () => {
  test('tem 60 NFTs válidos pelo contrato e 2 usuários', () => {
    const store = createStore(localStorage);
    store.reset('default');
    const { nfts, users } = store.get();

    expect(nfts).toHaveLength(60);
    expect(users.map((u) => u.email).sort()).toEqual(['ana@kurio.test', 'colecionador@kurio.test']);
    for (const nft of nfts) expect(NftSchema.safeParse(nft).success, nft.id).toBe(true);
  });

  test('contagem por categoria bate com as fixtures e cobre as 9 categorias', () => {
    const store = createStore(localStorage);
    store.reset('default');
    const categories = buildCategories(store.get().nfts);

    expect(categories.map((c) => c.id)).toEqual(CATEGORY_DEFINITIONS.map((c) => c.id));
    expect(categories.reduce((sum, c) => sum + c.count, 0)).toBe(60);
    for (const c of categories) expect(c.count).toBeGreaterThan(0);
  });

  test('fixtures cobrem os casos de disponibilidade e preço exigidos', () => {
    const store = createStore(localStorage);
    store.reset('default');
    const { nfts } = store.get();

    const soldOut = nfts.filter((n) => n.status === 'sold_out');
    expect(soldOut.length).toBeGreaterThanOrEqual(3);
    for (const n of soldOut) expect(n.editions.every((e) => e.available === 0)).toBe(true);

    const mixed = nfts.filter(
      (n) => n.editions.some((e) => e.available === 0) && n.editions.some((e) => e.available > 0),
    );
    expect(mixed.length).toBeGreaterThanOrEqual(1);

    const listPrices = nfts.map((n) => Math.min(...n.editions.map((e) => Number(e.price))));
    expect(Math.min(...listPrices)).toBe(0.39);
    expect(Math.max(...listPrices)).toBe(12.5);

    const days = new Set(nfts.map((n) => n.listedAt.slice(0, 10)));
    expect(days.size).toBe(60);
  });

  test('NFT de demonstração estável e nomes do layout', () => {
    const store = createStore(localStorage);
    store.reset('default');
    const { nfts } = store.get();
    const names = nfts.map((n) => n.name);

    expect(nfts.find((n) => n.id === 'nft-ivory-baron-088')?.name).toBe('Ivory Baron #088');
    expect(names).toEqual(
      expect.arrayContaining(['Emerald Ape #042', 'Violet Nomad #314', 'Golden Beat #207']),
    );
    expect(new Set(nfts.map((n) => n.id)).size).toBe(60);
  });
});

describe('cenários e reset', () => {
  test('empty-catalog não tem NFTs', () => {
    const store = createStore(localStorage);
    store.reset('empty-catalog');
    expect(store.get().nfts).toHaveLength(0);
    expect(store.get().meta.scenario).toBe('empty-catalog');
  });

  test('reset restaura o estado do cenário', () => {
    const store = createStore(localStorage);
    store.reset('default');
    const original = store.get().nfts[0]?.editions[0]?.price;

    store.update((d) => {
      const edition = d.nfts[0]?.editions[0];
      if (edition) edition.price = '9';
    });
    expect(store.get().nfts[0]?.editions[0]?.price).toBe('9');

    store.reset('default');
    expect(store.get().nfts[0]?.editions[0]?.price).toBe(original);
  });

  test('getScenario reflete o cenário atual com padrões do pedido', () => {
    const store = createStore(localStorage);
    store.reset('payment-declined');
    const scenario = getScenario(store);
    expect(scenario).toMatchObject({
      name: 'payment-declined',
      orderOutcome: 'rejected',
      orderResolveMs: 4000,
    });

    store.reset('default');
    expect(getScenario(store)).toMatchObject({
      name: 'default',
      orderOutcome: 'confirmed',
      network: 'normal',
    });
  });

  test('todos os cenários da spec existem e semeiam sem erro', () => {
    const store = createStore(localStorage);
    for (const name of SCENARIO_NAMES) {
      store.reset(name);
      expect(getScenario(store).name).toBe(name);
    }
    expect(SCENARIO_NAMES).toHaveLength(13);
  });
});

describe('persistência', () => {
  test('novo store lido do mesmo localStorage devolve o mesmo estado', () => {
    const a = createStore(localStorage);
    a.reset('default');
    a.update((d) => {
      d.favorites['user-1'] = ['nft-ivory-baron-088'];
    });

    const b = createStore(localStorage);
    expect(b.get()).toEqual(a.get());
    expect(b.get().favorites['user-1']).toEqual(['nft-ivory-baron-088']);
  });

  test('dado corrompido no storage é descartado e o default é semeado', () => {
    localStorage.setItem(MOCK_DB_STORAGE_KEY, '{quebrado');
    const store = createStore(localStorage);
    expect(store.get().nfts).toHaveLength(60);
  });
});

describe('prng', () => {
  test('createPrng(42) produz a mesma sequência duas vezes', () => {
    const a = createPrng(42);
    const b = createPrng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(new Set(seqA).size).toBe(5);
    for (const v of seqA) expect(v >= 0 && v < 1).toBe(true);
  });

  test('sementes diferentes produzem sequências diferentes', () => {
    expect(createPrng(1).next()).not.toBe(createPrng(2).next());
  });
});

describe('senhas', () => {
  test('o db não guarda senha em claro e o hash do seed confere', async () => {
    const store = createStore(localStorage);
    store.reset('default');
    const raw = JSON.stringify(store.get());
    expect(raw).not.toContain('Kurio@2026');

    const user = store.get().users.find((u) => u.email === 'colecionador@kurio.test');
    expect(user).toBeDefined();
    expect(await verifyPassword('Kurio@2026', user?.passwordHash ?? '')).toBe(true);
    expect(await verifyPassword('Kurio@2027', user?.passwordHash ?? '')).toBe(false);
  });

  test('hashPassword usa PBKDF2 com salt aleatório', async () => {
    const a = await hashPassword('Segredo@123');
    const b = await hashPassword('Segredo@123');
    expect(a).not.toBe(b);
    expect(a.startsWith('pbkdf2-sha256$100000$')).toBe(true);
    expect(await verifyPassword('Segredo@123', a)).toBe(true);
  });
});
