import { describe, expect, test } from 'vitest';

import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/contracts';

import { createEventGate } from './event-gate';

function nftEvent(eventId: string, nftId: string, version: number): NftUpdatedEvent {
  return {
    eventId,
    type: 'nft.updated',
    resource: { type: 'nft', id: nftId },
    version,
    occurredAt: '2026-11-24T12:00:00.000Z',
    data: { editions: [{ id: `${nftId}-1-10`, price: '1.5', available: 3 }], status: 'listed' },
  };
}

function orderEvent(eventId: string, orderId: string, version: number): OrderUpdatedEvent {
  return {
    eventId,
    type: 'order.updated',
    resource: { type: 'order', id: orderId },
    version,
    occurredAt: '2026-11-24T12:00:00.000Z',
    userId: 'u-1',
    data: { status: 'confirmed', txHash: '0xabc', rejectionReason: null, explorerUrl: null },
  };
}

describe('createEventGate', () => {
  test('aceita um evento novo', () => {
    const gate = createEventGate();
    expect(gate.accept(nftEvent('e1', 'nft-a', 1))).toBe(true);
  });

  test('rejeita o mesmo eventId repetido', () => {
    const gate = createEventGate();
    expect(gate.accept(nftEvent('e1', 'nft-a', 1))).toBe(true);
    expect(gate.accept(nftEvent('e1', 'nft-a', 1))).toBe(false);
  });

  test('rejeita versão menor ou igual à última aceita do mesmo recurso', () => {
    const gate = createEventGate();
    expect(gate.accept(nftEvent('e1', 'nft-a', 5))).toBe(true);
    expect(gate.accept(nftEvent('e2', 'nft-a', 5))).toBe(false);
    expect(gate.accept(nftEvent('e3', 'nft-a', 4))).toBe(false);
    expect(gate.accept(nftEvent('e4', 'nft-a', 6))).toBe(true);
  });

  test('a versão é por recurso: outro NFT (ou um pedido de mesmo id) não é afetado', () => {
    const gate = createEventGate();
    expect(gate.accept(nftEvent('e1', 'nft-a', 9))).toBe(true);
    expect(gate.accept(nftEvent('e2', 'nft-b', 2))).toBe(true);
    expect(gate.accept(orderEvent('e3', 'nft-a', 1))).toBe(true);
  });

  test('reset() esquece eventIds e versões', () => {
    const gate = createEventGate();
    gate.accept(nftEvent('e1', 'nft-a', 3));
    gate.reset();
    expect(gate.accept(nftEvent('e1', 'nft-a', 3))).toBe(true);
    expect(gate.accept(nftEvent('e2', 'nft-a', 1))).toBe(false);
  });

  test('guarda no máximo `maxIds` eventIds (descarta os mais antigos)', () => {
    const gate = createEventGate(2);
    gate.accept(nftEvent('e1', 'nft-a', 1));
    gate.accept(nftEvent('e2', 'nft-b', 1));
    gate.accept(nftEvent('e3', 'nft-c', 1));
    // e1 saiu da janela: só a versão do recurso o barra agora; num recurso novo ele passaria.
    expect(gate.accept(nftEvent('e1', 'nft-d', 1))).toBe(true);
    expect(gate.accept(nftEvent('e3', 'nft-e', 1))).toBe(false);
  });
});
