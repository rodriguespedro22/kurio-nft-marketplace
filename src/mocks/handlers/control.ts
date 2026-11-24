import { http, HttpResponse } from 'msw';

import { db } from '../db/store';
import { isNetworkProfile } from '../network/profiles';
import { resetNetworkState, setNetworkProfile } from '../network/with-network';
import { isScenarioName } from '../scenarios';
import { apiError, apiPath, bearerToken, readJson } from './http';

/** Resumo do banco para testes e para o painel (`GET /__mock/state`). */
export function mockState() {
  const d = db.get();
  return {
    scenario: d.meta.scenario,
    network: d.meta.network,
    counts: {
      nfts: d.nfts.length,
      users: d.users.length,
      sessions: d.sessions.length,
      carts: Object.keys(d.carts).length,
      quotes: Object.keys(d.quotes).length,
      orders: Object.keys(d.orders).length,
      wallets: d.wallets.length,
    },
    orders: Object.values(d.orders).map(({ id, status, userId, createdAt }) => ({
      id,
      status,
      userId,
      createdAt,
    })),
  };
}

const field = (body: unknown, key: string): unknown =>
  body && typeof body === 'object' ? (body as Record<string, unknown>)[key] : undefined;

// Controle do mock: só existe com mocks ativos e nunca passa pela rede simulada.
export const controlHandlers = [
  http.post(apiPath('/__mock/reset'), async ({ request }) => {
    const body = await readJson(request);
    const scenario =
      field(body, 'scenario') ?? new URL(request.url).searchParams.get('scenario') ?? 'default';
    if (!isScenarioName(scenario)) {
      return apiError(422, 'VALIDATION_ERROR', 'Cenário desconhecido.', {
        fields: { scenario: 'Cenário desconhecido' },
      });
    }
    db.reset(scenario);
    resetNetworkState();
    return HttpResponse.json(mockState());
  }),

  http.post(apiPath('/__mock/network'), async ({ request }) => {
    const profile = field(await readJson(request), 'profile');
    if (!isNetworkProfile(profile)) {
      return apiError(422, 'VALIDATION_ERROR', 'Perfil de rede desconhecido.', {
        fields: { profile: 'Perfil de rede desconhecido' },
      });
    }
    setNetworkProfile(profile);
    return HttpResponse.json(mockState());
  }),

  /** Expira a sessão do token enviado (ou todas, sem token) — simula expiração no servidor. */
  http.post(apiPath('/__mock/session/expire'), ({ request }) => {
    const token = bearerToken(request);
    const past = new Date(Date.now() - 1000).toISOString();
    let expired = 0;
    db.update((d) => {
      for (const session of d.sessions) {
        if (token === null || session.token === token) {
          session.expiresAt = past;
          expired += 1;
        }
      }
    });
    return HttpResponse.json({ expired });
  }),

  http.get(apiPath('/__mock/state'), () => HttpResponse.json(mockState())),
];
