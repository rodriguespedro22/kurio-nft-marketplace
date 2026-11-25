import { QueryClient } from '@tanstack/react-query';
import { describe, expect, test } from 'vitest';

import type { Cart } from '@/contracts';

import { isNewestServerCart } from './server-cart';

const cart = (updatedAt: string, ids: string[]): Cart => ({
  id: 'cart-1',
  items: ids.map((id) => ({ id }) as Cart['items'][number]),
  couponCode: null,
  updatedAt,
});

describe('respostas do carrinho fora de ordem', () => {
  test('uma resposta mais antiga que a última vista não é a mais nova', () => {
    const queryClient = new QueryClient();
    const key = ['guest', 'g-1', 'cart'];
    // A remoção (mais nova) chega antes do aumento de quantidade (mais antigo).
    expect(isNewestServerCart(queryClient, key, cart('2026-11-24T12:00:00.200Z', ['a']))).toBe(true);
    expect(isNewestServerCart(queryClient, key, cart('2026-11-24T12:00:00.100Z', ['a', 'b']))).toBe(false);
    expect(isNewestServerCart(queryClient, key, cart('2026-11-24T12:00:00.300Z', ['a']))).toBe(true);
  });

  test('donos e clientes diferentes não se misturam', () => {
    const a = new QueryClient();
    const b = new QueryClient();
    expect(isNewestServerCart(a, ['user', 'u-1', 'cart'], cart('2026-11-24T12:00:01.000Z', []))).toBe(true);
    expect(isNewestServerCart(a, ['user', 'u-2', 'cart'], cart('2026-11-24T12:00:00.000Z', []))).toBe(true);
    expect(isNewestServerCart(b, ['user', 'u-1', 'cart'], cart('2026-11-24T12:00:00.000Z', []))).toBe(true);
  });
});
