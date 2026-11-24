import { describe, expect, test } from 'vitest';

import type { NftListItem } from '@/contracts';

import { applyFavorite } from './optimistic';

const item = (id: string) => ({ id }) as NftListItem;
const ids = (list: { items: NftListItem[] } | undefined) => list?.items.map((i) => i.id);

describe('applyFavorite', () => {
  test('favoritar põe no topo sem duplicar; desfavoritar remove', () => {
    const list = { items: [item('a'), item('b')] };
    expect(ids(applyFavorite(list, item('c'), true))).toEqual(['c', 'a', 'b']);
    expect(ids(applyFavorite(list, item('b'), true))).toEqual(['b', 'a']);
    expect(ids(applyFavorite(list, item('a'), false))).toEqual(['b']);
  });

  test('rollback de uma remoção devolve o item à posição original', () => {
    const list = { items: [item('a'), item('b'), item('c')] };
    const removed = applyFavorite(list, item('b'), false);
    expect(ids(applyFavorite(removed, item('b'), true, 1))).toEqual(['a', 'b', 'c']);
  });

  test('lista ainda não carregada continua indefinida', () => {
    expect(applyFavorite(undefined, item('a'), true)).toBeUndefined();
  });
});
