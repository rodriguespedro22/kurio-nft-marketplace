import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import { EthSchema, IdSchema } from '@/contracts';

import { db } from '../db/store';
import { isNetworkProfile } from '../network/profiles';
import { resetNetworkState, setNetworkProfile } from '../network/with-network';
import { isScenarioName } from '../scenarios';
import { dropAllSockets, emitNftUpdated } from '../socket/server';
import { apiError, apiPath, bearerToken, readJson, validationError } from './http';

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

/** Mudança de preço/estoque de uma edição (ou de todas, sem `editionId`). */
const NftChangeSchema = z
  .object({
    editionId: IdSchema.optional(),
    price: EthSchema.optional(),
    available: z.number().int().min(0).optional(),
  })
  .refine((change) => change.price !== undefined || change.available !== undefined, {
    message: 'Informe price ou available',
    path: ['price'],
  });

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

  /**
   * Muda preço/estoque no banco **e** emite `nft.updated` pelo socket (ARCHITECTURE.md §10): REST e evento
   * ficam coerentes. Responde com o evento emitido.
   */
  http.post<{ id: string }>(apiPath('/__mock/nfts/:id/update'), async ({ request, params }) => {
    const parsed = NftChangeSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const { editionId, price, available } = parsed.data;

    const nft = db.get().nfts.find((n) => n.id === params.id);
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.');
    if (editionId && !nft.editions.some((e) => e.id === editionId)) {
      return apiError(422, 'VALIDATION_ERROR', 'Edição desconhecida.', {
        fields: { editionId: 'Edição desconhecida' },
      });
    }

    db.update((d) => {
      const target = d.nfts.find((n) => n.id === params.id)!;
      for (const edition of target.editions) {
        if (editionId && edition.id !== editionId) continue;
        if (price !== undefined) edition.price = price;
        if (available !== undefined) {
          edition.available = edition.supply === null ? available : Math.min(available, edition.supply);
        }
      }
      target.status = target.editions.every((e) => e.available === 0) ? 'sold_out' : 'listed';
    });
    return HttpResponse.json(emitNftUpdated(params.id));
  }),

  /** Derruba as conexões do socket simulado; o cliente reconecta sozinho. */
  http.post(apiPath('/__mock/socket/drop'), () => HttpResponse.json({ dropped: dropAllSockets() })),

  http.get(apiPath('/__mock/state'), () => HttpResponse.json(mockState())),
];
