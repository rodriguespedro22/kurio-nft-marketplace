import { QueryClient } from '@tanstack/react-query';
import { describe, expect, test } from 'vitest';

import type { Order, OrderUpdatedEvent } from '@/contracts';
import { qk } from '@/shared/api/query-keys';

import { applyOrderUpdated } from './apply-order-updated';
import { clearAttemptKey, getOrCreateAttemptKey } from './idempotency';
import { clearPendingOrder, getPendingOrder, rememberPendingOrder } from './pending-order';

describe('chave da tentativa de compra (sessionStorage)', () => {
  test('a mesma cotação reusa a chave; cotação nova ou fim da tentativa gera outra', () => {
    const first = getOrCreateAttemptKey('user-1', 'quote-1');
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(getOrCreateAttemptKey('user-1', 'quote-1')).toBe(first);
    expect(getOrCreateAttemptKey('user-2', 'quote-1')).not.toBe(first);

    const second = getOrCreateAttemptKey('user-1', 'quote-2');
    expect(second).not.toBe(first);

    clearAttemptKey('user-1');
    expect(getOrCreateAttemptKey('user-1', 'quote-2')).not.toBe(second);
  });
});

describe('pedido pendente (localStorage)', () => {
  test('lembra por usuário e limpa só o mesmo pedido', () => {
    rememberPendingOrder('user-1', 'order-1');
    expect(getPendingOrder('user-1')).toBe('order-1');
    expect(getPendingOrder('user-2')).toBeNull();

    clearPendingOrder('user-1', 'order-2');
    expect(getPendingOrder('user-1')).toBe('order-1');
    clearPendingOrder('user-1', 'order-1');
    expect(getPendingOrder('user-1')).toBeNull();
  });
});

const ORDER: Order = {
  id: 'order-1',
  status: 'pending',
  createdAt: '2026-11-24T12:00:00.000Z',
  updatedAt: '2026-11-24T12:00:00.000Z',
  version: 1,
  txHash: null,
  explorerUrl: null,
  rejectionReason: null,
  snapshot: {
    lines: [],
    subtotal: '1',
    discount: '0',
    networkFee: '0.016',
    total: '1.016',
    network: 'ethereum',
    walletId: 'wallet-1',
    walletProvider: 'metamask',
    walletAddress: '0xA91F6c3B9e2D4f5A8b7C1d0E9f8A7b6C5d4EE82C',
    coupon: null,
  },
};

const event = (version: number, status: Order['status']): OrderUpdatedEvent => ({
  eventId: `evt-${version}-${status}`,
  type: 'order.updated',
  resource: { type: 'order', id: 'order-1' },
  version,
  occurredAt: '2026-11-24T12:00:04.000Z',
  userId: 'user-1',
  data: {
    status,
    txHash: status === 'confirmed' ? '0xabc' : null,
    rejectionReason: null,
    explorerUrl: null,
  },
});

describe('applyOrderUpdated', () => {
  test('versão nova atualiza o pedido em cache; versão antiga não faz regredir', () => {
    const client = new QueryClient();
    const key = qk.user('user-1').order('order-1');
    client.setQueryData(key, ORDER);

    applyOrderUpdated(client, 'user-1', event(2, 'confirmed'));
    expect(client.getQueryData<Order>(key)).toMatchObject({
      status: 'confirmed',
      txHash: '0xabc',
      version: 2,
    });

    applyOrderUpdated(client, 'user-1', event(1, 'pending'));
    expect(client.getQueryData<Order>(key)).toMatchObject({ status: 'confirmed', version: 2 });
  });

  test('pedido terminal: esquece o pedido pendente e a chave da tentativa', () => {
    const client = new QueryClient();
    rememberPendingOrder('user-1', 'order-1');
    const key = getOrCreateAttemptKey('user-1', 'quote-1');

    applyOrderUpdated(client, 'user-1', event(2, 'rejected'));
    expect(getPendingOrder('user-1')).toBeNull();
    expect(getOrCreateAttemptKey('user-1', 'quote-1')).not.toBe(key);
  });
});
