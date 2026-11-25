import { setupWorker } from 'msw/browser';

import { db } from './db/store';
import { handlers } from './handlers';
import { scheduleOpenOrders } from './handlers/orders';
import { isNetworkProfile } from './network/profiles';
import { resetNetworkState, setNetworkProfile } from './network/with-network';
import { isScenarioName } from './scenarios';

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

export async function enableMocking(): Promise<void> {
  applyBootSelection();
  const worker = setupWorker(...handlers);
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
  // Pedidos pendentes de antes do reload voltam à agenda (resolução a partir de `createdAt`).
  scheduleOpenOrders();
}
