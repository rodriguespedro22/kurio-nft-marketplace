import { describe, expect, test } from 'vitest';

import type { Quote } from '@/contracts';

import { quoteChanges } from './quote-changes';

const QUOTE: Quote = {
  quoteId: 'quote-1',
  version: 1,
  network: 'ethereum',
  lines: [
    {
      cartItemId: 'item-1',
      nftId: 'nft-1',
      editionId: 'ed-1',
      quantity: 2,
      unitPrice: '1.2',
      lineTotal: '2.4',
    },
  ],
  subtotal: '2.4',
  discount: '0',
  networkFee: '0.016',
  total: '2.416',
  coupon: null,
  issues: [],
  expiresAt: '2026-11-24T12:00:00.000Z',
};

describe('quoteChanges', () => {
  test('mesma cotação renovada (id e versão novos) não tem mudanças', () => {
    expect(quoteChanges(QUOTE, { ...QUOTE, quoteId: 'quote-2', version: 2 })).toEqual([]);
  });

  test('aponta preço de linha, desconto, taxa e total que mudaram, na ordem do resumo', () => {
    const current: Quote = {
      ...QUOTE,
      lines: [{ ...QUOTE.lines[0]!, unitPrice: '1.5', lineTotal: '3' }],
      subtotal: '3',
      discount: '0.3',
      total: '2.716',
    };
    expect(quoteChanges(QUOTE, current, { 'item-1': 'Ivory Baron #088' })).toEqual([
      { key: 'line:item-1', label: 'Ivory Baron #088', previous: '2.4', current: '3' },
      { key: 'subtotal', label: 'Subtotal', previous: '2.4', current: '3' },
      { key: 'discount', label: 'Desconto do lançamento', previous: '0', current: '0.3' },
      { key: 'total', label: 'Total', previous: '2.416', current: '2.716' },
    ]);
  });

  test('linha que saiu da cotação aparece como removida', () => {
    const current: Quote = { ...QUOTE, lines: [], subtotal: '0', total: '0.016' };
    expect(quoteChanges(QUOTE, current)[0]).toEqual({
      key: 'line:item-1',
      label: 'Item',
      previous: '2.4',
      current: null,
    });
  });
});
