import { QueryClient } from '@tanstack/react-query';
import { describe, expect, test } from 'vitest';

import type { CreateOrderInput, Order, OrderUpdatedEvent } from '@/contracts';
import { qk } from '@/shared/api/query-keys';

import { applyOrderUpdated } from './apply-order-updated';
import { beginAttempt, clearAttemptKey, getUnsettledAttempt, settleAttempt } from './idempotency';
import { clearPendingOrder, getPendingOrder, rememberPendingOrder } from './pending-order';

const input = (quoteId: string, walletId = 'wallet-1') =>
  ({ quoteId, quoteVersion: 1, walletId, network: 'ethereum', buyer: {} }) as unknown as CreateOrderInput;

describe('tentativa de compra (sessionStorage)', () => {
  test('a mesma cotação reusa a chave; cotação nova depois de resolvida gera outra', () => {
    const first = beginAttempt('user-1', input('quote-1'));
    expect(first.key).toMatch(/^[0-9a-f-]{36}$/);
    settleAttempt('user-1');
    expect(beginAttempt('user-1', input('quote-1')).key).toBe(first.key);
    expect(beginAttempt('user-2', input('quote-1')).key).not.toBe(first.key);

    settleAttempt('user-1');
    const second = beginAttempt('user-1', input('quote-2'));
    expect(second.key).not.toBe(first.key);

    clearAttemptKey('user-1');
    expect(beginAttempt('user-1', input('quote-2')).key).not.toBe(second.key);
  });

  test('envio sem resposta definitiva: cotação nova reusa a chave e o corpo do envio', () => {
    clearAttemptKey('user-1');
    const sent = beginAttempt('user-1', input('quote-1'));
    expect(getUnsettledAttempt('user-1')).toEqual(sent);

    const retry = beginAttempt('user-1', input('quote-2', 'wallet-2'));
    expect(retry).toEqual(sent);
    expect(retry.input.quoteId).toBe('quote-1');

    settleAttempt('user-1');
    expect(getUnsettledAttempt('user-1')).toBeNull();
    expect(beginAttempt('user-1', input('quote-2')).key).not.toBe(sent.key);
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
    const { key } = beginAttempt('user-1', input('quote-1'));

    applyOrderUpdated(client, 'user-1', event(2, 'rejected'));
    expect(getPendingOrder('user-1')).toBeNull();
    expect(getUnsettledAttempt('user-1')).toBeNull();
    expect(beginAttempt('user-1', input('quote-1')).key).not.toBe(key);
  });
});
