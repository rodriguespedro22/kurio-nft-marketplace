import { describe, expect, test } from 'vitest';

import { CatalogSearchSchema } from '@/contracts';
import { qk } from '@/shared/api/query-keys';

import { isRealtimeBacked } from './socket';

describe('isRealtimeBacked (o que revalidar ao reconectar)', () => {
  test('catálogo, destaques e detalhe de NFT', () => {
    expect(isRealtimeBacked(qk.catalog(CatalogSearchSchema.parse({})))).toBe(true);
    expect(isRealtimeBacked(qk.featured())).toBe(true);
    expect(isRealtimeBacked(qk.nft('nft-a'))).toBe(true);
  });

  test('carrinho, cotação e pedido — do usuário e do visitante', () => {
    expect(isRealtimeBacked(qk.user('u-1').cart)).toBe(true);
    expect(isRealtimeBacked(qk.user('u-1').quote({ network: 'ethereum' }))).toBe(true);
    expect(isRealtimeBacked(qk.user('u-1').order('o-1'))).toBe(true);
    expect(isRealtimeBacked(qk.guest('g-1').cart)).toBe(true);
    expect(isRealtimeBacked(qk.guest('g-1').quote({ network: 'ethereum' }))).toBe(true);
  });

  test('o resto não depende de eventos', () => {
    expect(isRealtimeBacked(qk.categories())).toBe(false);
    expect(isRealtimeBacked(qk.facets())).toBe(false);
    expect(isRealtimeBacked(qk.user('u-1').favorites)).toBe(false);
    expect(isRealtimeBacked(qk.user('u-1').profile)).toBe(false);
    expect(isRealtimeBacked(qk.user('u-1').wallets)).toBe(false);
    expect(isRealtimeBacked(qk.user('u-1').session)).toBe(false);
    // Um id de usuário chamado "cart" não confunde a regra.
    expect(isRealtimeBacked(['user', 'cart', 'favorites'])).toBe(false);
  });
});
