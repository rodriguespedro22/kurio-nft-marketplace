import axios from 'axios';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { toApiError } from '@/shared/api/api-error';

import { db } from '../db/store';
import { apiPath } from '../handlers/http';
import { server } from '../node';
import { createLatency, createOutOfOrderTracker } from './profiles';
import { resetNetworkState, withNetwork } from './with-network';

const client = axios.create({ baseURL: '/api' });

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return toApiError(error);
  }
  throw new Error('a requisição deveria ter falhado');
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  db.reset('default');
  resetNetworkState();
  server.use(
    http.get(
      apiPath('/__test/ping'),
      withNetwork(() => HttpResponse.json({ ok: true })),
    ),
    http.post(
      apiPath('/__test/ping'),
      withNetwork(() => HttpResponse.json({ ok: true })),
    ),
    http.get(
      apiPath('/__test/catalog'),
      withNetwork(() => HttpResponse.json({ ok: true }), { route: 'catalog' }),
    ),
  );
});
afterEach(() => server.resetHandlers());

describe('perfis de rede', () => {
  test('offline → erro de rede com code NETWORK; controle continua respondendo', async () => {
    await client.post('/__mock/network', { profile: 'offline' });

    const error = await failure(client.get('/__test/ping'));
    expect(error.code).toBe('NETWORK');

    const state = await client.get('/__mock/state');
    expect(state.data.network).toBe('offline');
  });

  test('flaky → 1ª GET 200, 2ª 503 TRANSIENT, 3ª 200; POST não é afetado', async () => {
    await client.post('/__mock/network', { profile: 'flaky' });

    expect((await client.get('/__test/ping')).status).toBe(200);
    const error = await failure(client.get('/__test/ping'));
    expect(error).toMatchObject({ code: 'TRANSIENT', status: 503 });
    expect((await client.get('/__test/ping')).status).toBe(200);
    expect((await client.post('/__test/ping')).status).toBe(200);
  });

  test('perfil desconhecido é recusado com 422', async () => {
    const error = await failure(client.post('/__mock/network', { profile: 'satellite' }));
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', status: 422 });
  });

  test('jitter com seed 7 produz os mesmos delays em duas execuções', () => {
    const a = createLatency('jitter', 7);
    const b = createLatency('jitter', 7);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());

    expect(seqA).toEqual(seqB);
    for (const ms of seqA) expect(ms >= 100 && ms <= 3000).toBe(true);
    expect(new Set(seqA).size).toBeGreaterThan(1);
  });

  test('faixas de latência por perfil', () => {
    const normal = createLatency('normal', 7);
    for (let i = 0; i < 20; i++) {
      const ms = normal();
      expect(ms >= 150 && ms <= 400).toBe(true);
    }
    expect(createLatency('slow', 7)()).toBe(2500);
    expect(createLatency('offline', 7)()).toBe(0);
  });
});

describe('cenários aplicados pela rede', () => {
  test('out-of-order: buscas seguidas atrasam cada vez menos e o ciclo recomeça após pausa', () => {
    let now = 0;
    const tracker = createOutOfOrderTracker(() => now);

    expect(tracker.next()).toBe(1500);
    now = 100;
    expect(tracker.next()).toBe(1100);
    now = 200;
    expect(tracker.next()).toBe(700);
    now = 300;
    expect(tracker.next()).toBe(300);
    now = 400;
    expect(tracker.next()).toBe(100);
    now = 4000;
    expect(tracker.next()).toBe(1500);
  });

  test('server-errors: rotas de catálogo respondem 503 persistente', async () => {
    await client.post('/__mock/reset', { scenario: 'server-errors' });

    for (let i = 0; i < 3; i++) {
      const error = await failure(client.get('/__test/catalog'));
      expect(error).toMatchObject({ code: 'TRANSIENT', status: 503 });
    }
    expect((await client.get('/__test/ping')).status).toBe(200);
  });
});

describe('API de controle', () => {
  test('POST /__mock/reset {scenario: empty-catalog} esvazia o catálogo', async () => {
    const reset = await client.post('/__mock/reset', { scenario: 'empty-catalog' });
    expect(reset.data).toMatchObject({ scenario: 'empty-catalog', counts: { nfts: 0 } });

    const state = await client.get('/__mock/state');
    expect(state.data.counts.nfts).toBe(0);
    expect(db.get().nfts).toHaveLength(0);
  });

  test('reset aceita o cenário pela query e aplica a rede do cenário', async () => {
    await client.post('/__mock/reset?scenario=slow-network');
    const state = await client.get('/__mock/state');
    expect(state.data).toMatchObject({ scenario: 'slow-network', network: 'slow', counts: { nfts: 60 } });
  });

  test('cenário desconhecido é recusado', async () => {
    const error = await failure(client.post('/__mock/reset', { scenario: 'apocalipse' }));
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', status: 422 });
  });

  test('session/expire expira a sessão do token enviado', async () => {
    db.update((d) => {
      d.sessions.push(
        {
          token: 'tok-a',
          userId: 'user-1',
          createdAt: '2026-11-24T10:00:00.000Z',
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
        {
          token: 'tok-b',
          userId: 'user-2',
          createdAt: '2026-11-24T10:00:00.000Z',
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
      );
    });

    const res = await client.post('/__mock/session/expire', null, {
      headers: { Authorization: 'Bearer tok-a' },
    });
    expect(res.data).toEqual({ expired: 1 });

    const sessions = db.get().sessions;
    expect(Date.parse(sessions.find((s) => s.token === 'tok-a')?.expiresAt ?? '')).toBeLessThan(Date.now());
    expect(sessions.find((s) => s.token === 'tok-b')?.expiresAt).toBe('2099-01-01T00:00:00.000Z');
  });
});
