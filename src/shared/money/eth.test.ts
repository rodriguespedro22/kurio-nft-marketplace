import { describe, expect, test } from 'vitest';

import { addEth, cmpEth, formatEth, mulEth, pctEth, subEth } from './eth';

describe('operações decimais em ETH', () => {
  test('soma sem erro de ponto flutuante', () => {
    expect(addEth('0.1', '0.2')).toBe('0.3');
  });

  test('soma vários valores', () => {
    expect(addEth('26.83', '0.016')).toBe('26.846');
    expect(addEth('8.34', '8.34', '8.34', '2.38')).toBe('27.4');
    expect(addEth()).toBe('0');
  });

  test('multiplica por quantidade inteira', () => {
    expect(mulEth('8.34', 3)).toBe('25.02');
  });

  test('calcula percentual', () => {
    expect(pctEth('26.83', 10)).toBe('2.683');
    expect(pctEth('27.4', 10)).toBe('2.74');
  });

  test('subtrai', () => {
    expect(subEth('27.4', '2.74')).toBe('24.66');
  });

  test('compara ignorando zeros à direita', () => {
    expect(cmpEth('1.0', '1')).toBe(0);
    expect(cmpEth('0.9', '1')).toBe(-1);
    expect(cmpEth('1.01', '1')).toBe(1);
  });

  test('nunca usa notação exponencial', () => {
    expect(addEth('0.000000000000000001', '0')).toBe('0.000000000000000001');
    expect(mulEth('1000000', 1000)).toBe('1000000000');
  });

  test('mantém 18 casas decimais no máximo', () => {
    expect(pctEth('0.000000000000000001', 50)).toBe('0.000000000000000001');
  });
});

describe('formatEth', () => {
  test('formata com sufixo e sem zeros extras', () => {
    expect(formatEth('26.846')).toBe('26.846 ETH');
  });

  test('usa no mínimo duas casas, como no layout', () => {
    expect(formatEth('0')).toBe('0.00 ETH');
    expect(formatEth('1.2')).toBe('1.20 ETH');
    expect(formatEth('2')).toBe('2.00 ETH');
  });

  test('limita casas decimais quando pedido', () => {
    expect(formatEth('8.33333333', { maxDecimals: 4 })).toBe('8.3333 ETH');
    expect(formatEth('0.0004', { maxDecimals: 3 })).toBe('0.00 ETH');
  });
});
