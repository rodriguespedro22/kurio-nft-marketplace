import type { Page } from '@playwright/test';

import type { NetworkProfileName } from '../../src/mocks/network/profiles';
import type { ScenarioName } from '../../src/mocks/scenarios/definitions';

// Espelha `MOCK_BOOT_KEY` de src/mocks/browser.ts (importar o valor traria o msw/browser ao Node).
const MOCK_BOOT_KEY = 'kurio:mock:boot';
const BOOT_APPLIED_KEY = 'kurio:mock:boot-applied';
const API_BASE = '/api';

/**
 * Seleciona o cenário antes do primeiro carregamento. O init script roda em toda navegação,
 * mas aplica o boot uma única vez por teste (nonce em localStorage): reloads e novas abas do
 * mesmo contexto preservam o estado do banco simulado.
 */
export async function bootScenario(
  page: Page,
  scenario: ScenarioName,
  opts: { network?: NetworkProfileName } = {},
): Promise<void> {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.addInitScript(
    ({ bootKey, appliedKey, value, nonce: id }) => {
      if (localStorage.getItem(appliedKey) === id) return;
      localStorage.setItem(appliedKey, id);
      localStorage.setItem(bootKey, value);
    },
    {
      bootKey: MOCK_BOOT_KEY,
      appliedKey: BOOT_APPLIED_KEY,
      value: JSON.stringify({ scenario, network: opts.network }),
      nonce,
    },
  );
}

/** Chama a API de controle do mock de dentro da página (passa pelo Service Worker do MSW). */
export async function mockControl(page: Page, path: string, body?: unknown): Promise<unknown> {
  return page.evaluate(
    async ({ url, payload }) => {
      const init: RequestInit =
        payload === undefined
          ? { method: 'GET' }
          : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload };
      const response = await fetch(url, init);
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(`mockControl ${url} → ${response.status}: ${JSON.stringify(data)}`);
      return data;
    },
    { url: `${API_BASE}${path}`, payload: body === undefined ? undefined : JSON.stringify(body) },
  );
}

export async function setNetwork(page: Page, profile: NetworkProfileName): Promise<void> {
  await mockControl(page, '/__mock/network', { profile });
}

/** Expira no servidor simulado todas as sessões abertas (o próximo request autenticado recebe 401). */
export async function expireSession(page: Page): Promise<void> {
  await mockControl(page, '/__mock/session/expire', {});
}
