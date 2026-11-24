import { describe, expect, test } from 'vitest';

import { pageWindow } from './pagination';

describe('pageWindow()', () => {
  test('até 7 páginas mostra todas', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('muitas páginas: primeira, vizinhas da atual e última, com lacunas', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
    expect(pageWindow(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
    expect(pageWindow(20, 20)).toEqual([1, 'gap', 16, 17, 18, 19, 20]);
  });

  test('sem páginas → lista vazia; página fora do intervalo é limitada', () => {
    expect(pageWindow(1, 0)).toEqual([]);
    expect(pageWindow(99, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
