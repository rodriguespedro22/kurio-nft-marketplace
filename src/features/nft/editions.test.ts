import { expect, test } from 'vitest';

import type { Edition } from '@/contracts';

import { defaultEditionId } from './editions';

const edition = (id: string, price: string, available: number): Edition => ({
  id,
  label: id,
  kind: 'limited',
  price,
  supply: 10,
  available,
});

test('escolhe a edição disponível mais barata', () => {
  expect(defaultEditionId([edition('a', '3.58', 5), edition('b', '1.79', 40), edition('c', '2.00', 9)])).toBe(
    'b',
  );
});

test('empate de preço fica com a primeira na ordem; esgotada nunca é escolhida se houver estoque', () => {
  expect(
    defaultEditionId([edition('a', '0.99', 0), edition('b', '1.79', 40), edition('c', '1.79', 500)]),
  ).toBe('b');
});

test('tudo esgotado: a mais barata mesmo assim; lista vazia → string vazia', () => {
  expect(defaultEditionId([edition('a', '3.96', 0), edition('b', '0.99', 0)])).toBe('b');
  expect(defaultEditionId([])).toBe('');
});
