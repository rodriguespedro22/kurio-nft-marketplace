import { describe, expect, test } from 'vitest';

import { catalogSearchSchema, mergeCatalogSearch, toCatalogParams } from './search';

describe('catalogSearchSchema', () => {
  test('aplica page=1 por padrão e descarta valores inválidos sem quebrar a rota', () => {
    expect(catalogSearchSchema.parse({})).toEqual({ page: 1 });
    expect(catalogSearchSchema.parse({ sort: 'popular', page: -3, tab: 'x', minPrice: 'abc' })).toEqual({
      page: 1,
    });
  });

  test('normaliza o que o router entrega (número em q, item único em listas)', () => {
    expect(catalogSearchSchema.parse({ q: 42, category: 'musica', network: 'polygon' })).toEqual({
      q: '42',
      category: ['musica'],
      network: ['polygon'],
      page: 1,
    });
  });
});

describe('mergeCatalogSearch()', () => {
  const prev = { q: 'ape', category: ['musica'], page: 3 };

  test('mudar qualquer filtro zera a página', () => {
    expect(mergeCatalogSearch(prev, { sort: 'price_asc' })).toEqual({
      q: 'ape',
      category: ['musica'],
      sort: 'price_asc',
      page: 1,
    });
  });

  test('mudar só a página preserva os filtros', () => {
    expect(mergeCatalogSearch(prev, { page: 4 })).toEqual({ ...prev, page: 4 });
  });

  test('valores vazios saem da busca (lista vazia, texto vazio, undefined)', () => {
    expect(mergeCatalogSearch(prev, { category: [], q: '  ' })).toEqual({ page: 1 });
    expect(mergeCatalogSearch({ ...prev, sort: 'name' }, { sort: undefined })).toEqual({
      q: 'ape',
      category: ['musica'],
      page: 1,
    });
  });
});

test('toCatalogParams leva a busca para a API sem chaves vazias', () => {
  expect(toCatalogParams({ q: 'ivory', category: ['musica'], page: 2 })).toEqual({
    q: 'ivory',
    category: ['musica'],
    page: 2,
  });
});
