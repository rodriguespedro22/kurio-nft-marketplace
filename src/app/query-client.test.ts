import { describe, expect, test } from 'vitest';

import { ApiError } from '@/shared/api/api-error';
import { qk } from '@/shared/api/query-keys';

import { createQueryClient } from './query-client';

type RetryFn = (failureCount: number, error: unknown) => boolean;
type DelayFn = (attempt: number, error: unknown) => number;

const err = (status: number, code: ApiError['code']) => new ApiError({ status, code });

describe('createQueryClient()', () => {
  const client = createQueryClient();
  const queries = client.getDefaultOptions().queries ?? {};
  const retry = queries.retry as RetryFn;
  const retryDelay = queries.retryDelay as DelayFn;

  test('retry só para NETWORK, TRANSIENT ou 5xx, no máximo 2 vezes', () => {
    expect(retry(0, err(0, 'NETWORK'))).toBe(true);
    expect(retry(1, err(503, 'TRANSIENT'))).toBe(true);
    expect(retry(0, err(500, 'UNKNOWN'))).toBe(true);
    expect(retry(2, err(0, 'NETWORK'))).toBe(false);
    expect(retry(0, err(422, 'VALIDATION_ERROR'))).toBe(false);
    expect(retry(0, err(404, 'NOT_FOUND'))).toBe(false);
    expect(retry(0, err(0, 'TIMEOUT'))).toBe(false);
    expect(retry(0, new Error('qualquer'))).toBe(false);
  });

  test('retryDelay exponencial 500ms·2ⁿ', () => {
    expect(retryDelay(0, null)).toBe(500);
    expect(retryDelay(1, null)).toBe(1000);
    expect(retryDelay(2, null)).toBe(2000);
  });

  test('padrões: staleTime 30s, sem refetch ao focar; mutations sem retry', () => {
    expect(queries.staleTime).toBe(30_000);
    expect(queries.refetchOnWindowFocus).toBe(false);
    expect(client.getDefaultOptions().mutations?.retry).toBe(0);
  });

  test('queries privadas (["user", …]) usam staleTime 10s e refetch ao focar', () => {
    const defaults = client.getQueryDefaults(qk.user('u1').cart);
    expect(defaults.staleTime).toBe(10_000);
    expect(defaults.refetchOnWindowFocus).toBe(true);
  });

  test('categorias ficam frescas por 5 minutos', () => {
    expect(client.getQueryDefaults(qk.categories()).staleTime).toBe(300_000);
  });
});

describe('qk', () => {
  test('chaves privadas são prefixadas por ["user", userId]', () => {
    const u = qk.user('u1');
    expect(u.all).toEqual(['user', 'u1']);
    expect(u.cart).toEqual(['user', 'u1', 'cart']);
    expect(u.quote({ network: 'ethereum' })).toEqual(['user', 'u1', 'quote', { network: 'ethereum' }]);
    expect(u.order('o1')).toEqual(['user', 'u1', 'order', 'o1']);
    expect(qk.guest('g1').cart).toEqual(['guest', 'g1', 'cart']);
  });
});
