import { QueryClient } from '@tanstack/react-query';
import { describe, expect, test } from 'vitest';

import { fetchNewest } from './fetch-newest';

type Doc = { id: string; version: number; status: string };
const key = ['user', 'user-1', 'order', 'order-1'];

describe('fetchNewest', () => {
  test('resposta REST mais antiga que o cache (evento chegou durante a busca) não regride', async () => {
    const client = new QueryClient();
    client.setQueryData<Doc>(key, { id: 'order-1', version: 1, status: 'pending' });

    const result = await fetchNewest<Doc>(client, key, async () => {
      // O servidor leu o pedido ainda pendente; antes de a resposta chegar, o evento o confirmou.
      client.setQueryData<Doc>(key, { id: 'order-1', version: 2, status: 'confirmed' });
      return { id: 'order-1', version: 1, status: 'pending' };
    });

    expect(result).toEqual({ id: 'order-1', version: 2, status: 'confirmed' });
  });

  test('resposta igual ou mais nova que o cache vence', async () => {
    const client = new QueryClient();
    client.setQueryData<Doc>(key, { id: 'order-1', version: 2, status: 'pending' });

    expect(
      await fetchNewest<Doc>(client, key, async () => ({ id: 'order-1', version: 3, status: 'confirmed' })),
    ).toEqual({ id: 'order-1', version: 3, status: 'confirmed' });
    expect(
      await fetchNewest<Doc>(client, key, async () => ({ id: 'order-1', version: 3, status: 'x' })),
    ).toEqual({ id: 'order-1', version: 3, status: 'x' });
  });

  test('sem cache, devolve a resposta', async () => {
    const client = new QueryClient();
    expect(
      await fetchNewest<Doc>(client, key, async () => ({ id: 'order-1', version: 1, status: 'pending' })),
    ).toEqual({ id: 'order-1', version: 1, status: 'pending' });
  });
});
