import { delay, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw';

import { db } from '../db/store';
import { apiError } from '../handlers/http';
import { getScenario } from '../scenarios';
import {
  createLatency,
  createOutOfOrderTracker,
  ORDER_TIMEOUT_DELAY_MS,
  type NetworkProfileName,
  type OutOfOrderTracker,
} from './profiles';

const NETWORK_SEED = 7;

/**
 * Rotas que recebem efeitos específicos de cenário:
 * - `nfts`: busca do catálogo (`GET /nfts`) — out-of-order e server-errors;
 * - `catalog`: demais leituras do catálogo — server-errors;
 * - `orders`: criação de pedido — perfil `timeout-orders`.
 */
export type NetworkRoute = 'nfts' | 'catalog' | 'orders';
type NetworkOptions = { route?: NetworkRoute };

type Runtime = {
  profile: NetworkProfileName;
  latency: () => number;
  getRequests: number;
  outOfOrder: OutOfOrderTracker;
};

let runtime: Runtime | null = null;

function currentRuntime(): Runtime {
  const profile = db.get().meta.network;
  if (!runtime || runtime.profile !== profile) {
    runtime = {
      profile,
      latency: createLatency(profile, NETWORK_SEED),
      getRequests: 0,
      outOfOrder: createOutOfOrderTracker(),
    };
  }
  return runtime;
}

/** Zera contadores e sementes (chamado em reset de cenário e troca de perfil). */
export function resetNetworkState(): void {
  runtime = null;
}

export function setNetworkProfile(profile: NetworkProfileName): void {
  db.update((d) => {
    d.meta.network = profile;
  });
  resetNetworkState();
}

const transient = () => apiError(503, 'TRANSIENT', 'Serviço temporariamente indisponível. Tente novamente.');

/**
 * Envolve um resolver de dados com a rede simulada: latência do perfil, queda (`offline`),
 * falha intermitente (`flaky`: toda 2ª GET → 503) e os efeitos de cenário por rota.
 * Endpoints de controle (`/__mock/*`) não usam este wrapper.
 */
export function withNetwork<
  Params extends PathParams<keyof Params> = PathParams,
  RequestBody extends DefaultBodyType = DefaultBodyType,
>(
  resolver: HttpResponseResolver<Params, RequestBody>,
  { route }: NetworkOptions = {},
): HttpResponseResolver<Params, RequestBody> {
  return async (info) => {
    const network = currentRuntime();
    const scenario = getScenario();
    const isGet = info.request.method === 'GET';

    if (network.profile === 'offline') return HttpResponse.error();

    let wait = network.latency();
    if (network.profile === 'timeout-orders' && route === 'orders' && info.request.method === 'POST') {
      wait = ORDER_TIMEOUT_DELAY_MS;
    }
    if (scenario.outOfOrderSearch && route === 'nfts') wait = network.outOfOrder.next();
    if (wait > 0) await delay(wait);

    if (network.profile === 'flaky' && isGet) {
      network.getRequests += 1;
      if (network.getRequests % 2 === 0) return transient();
    }
    // Perfil server-errors: catálogo em 503 até a rede voltar ao normal (painel de cenários).
    if (network.profile === 'server-errors' && (route === 'nfts' || route === 'catalog')) {
      return transient();
    }

    return resolver(info);
  };
}
