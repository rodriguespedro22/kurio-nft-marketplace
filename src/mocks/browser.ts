import { http, passthrough } from 'msw';
import { setupWorker } from 'msw/browser';

import { db } from './db/store';
import { handlers } from './handlers';
import { API_URL } from './handlers/http';
import { scheduleOpenOrders } from './handlers/orders';
import { mountMockPanel } from './panel/mount';
import { isNetworkProfile } from './network/profiles';
import { resetNetworkState, setNetworkProfile } from './network/with-network';
import { isScenarioName } from './scenarios';

const API_PREFIX = new URL(`${API_URL}/`, window.location.origin).href;

/**
 * O Service Worker repassa à página toda requisição sob seu escopo (chunks, imagens, fontes), e o
 * MSW testaria cada uma contra todos os handlers (URL, cookies e rota, ~40 vezes). O que não é da
 * API segue direto para a rede já no primeiro handler.
 */
const staticPassthrough = http.all(
  ({ request }) => !request.url.startsWith(API_PREFIX),
  () => passthrough(),
);

/** Chave gravada pelos testes E2E (`addInitScript`) antes do primeiro carregamento. */
export const MOCK_BOOT_KEY = 'kurio:mock:boot';

type BootConfig = { scenario?: unknown; network?: unknown };

function readBootConfig(): BootConfig | null {
  try {
    const raw = localStorage.getItem(MOCK_BOOT_KEY);
    if (!raw) return null;
    localStorage.removeItem(MOCK_BOOT_KEY);
    return JSON.parse(raw) as BootConfig;
  } catch {
    return null;
  }
}

/**
 * Seleção de cenário no boot, em ordem: `localStorage['kurio:mock:boot']` (testes) e
 * `?scenario=` na URL (demo). O parâmetro sai da URL para um reload não resetar de novo.
 */
function applyBootSelection(): void {
  const boot = readBootConfig();
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get('scenario');

  const scenario = boot?.scenario ?? fromUrl;
  if (isScenarioName(scenario)) {
    db.reset(scenario);
    resetNetworkState();
  }
  if (isNetworkProfile(boot?.network)) setNetworkProfile(boot.network);

  if (fromUrl !== null) {
    url.searchParams.delete('scenario');
    window.history.replaceState(window.history.state, '', url);
  }
}

/**
 * O MSW só intercepta páginas sob o controle do Service Worker. O worker se desregistra quando a
 * última aba sai, e uma navegação logo em seguida (reload seguido de outra página) pode nascer antes
 * de o novo registro ativar: sem controlador. O MSW recarrega essa página, mas `worker.start()`
 * resolve antes disso, e o app renderizaria mandando as chamadas para a rede real (um reenvio de
 * pedido respondido com 404, por exemplo). Espera a ativação assumir a página ou a recarga trocá-la.
 */
function waitForController(): Promise<void> {
  if (navigator.serviceWorker.controller) return Promise.resolve();
  return new Promise((resolve) => {
    navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
  });
}

export async function enableMocking(): Promise<void> {
  applyBootSelection();
  const worker = setupWorker(staticPassthrough, ...handlers);
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
  await waitForController();
  // Pedidos pendentes de antes do reload voltam à agenda (resolução a partir de `createdAt`).
  scheduleOpenOrders();
  mountMockPanel();
}
