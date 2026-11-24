import { expect, type Page } from '@playwright/test';

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

/**
 * O app só renderiza depois de `enableMocking()` (src/main.tsx): `#root` com conteúdo garante que
 * o Service Worker do MSW já intercepta. Sem isso, um fetch logo após `goto` cai no Vite (404).
 */
async function mockReady(page: Page): Promise<void> {
  await page.locator('#root > *').first().waitFor({ state: 'attached' });
}

/** Chama a API de controle do mock de dentro da página (passa pelo Service Worker do MSW). */
export async function mockControl(page: Page, path: string, body?: unknown): Promise<unknown> {
  await mockReady(page);
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

// Espelha `SESSION_STORAGE_KEY` de src/features/auth/session.ts.
const SESSION_STORAGE_KEY = 'kurio:session';

/** GET autenticado com a sessão salva na página — lê o estado do servidor simulado. */
export async function apiAsUser<T = unknown>(page: Page, path: string): Promise<T> {
  await mockReady(page);
  return page.evaluate(
    async ({ url, key }) => {
      const raw = localStorage.getItem(key);
      const token = raw ? (JSON.parse(raw) as { token: string }).token : '';
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`apiAsUser ${url} → ${response.status}`);
      return (await response.json()) as T;
    },
    { url: `${API_BASE}${path}`, key: SESSION_STORAGE_KEY },
  );
}

/** Ids dos favoritos do usuário logado, direto do servidor simulado. */
export async function serverFavoriteIds(page: Page): Promise<string[]> {
  const body = await apiAsUser<{ items: { id: string }[] }>(page, '/favorites');
  return body.items.map((item) => item.id);
}

// Espelha `GUEST_CART_STORAGE_KEY` de src/features/auth/session.ts.
const GUEST_CART_STORAGE_KEY = 'kurio:guest-cart';

/** Carrinho atual direto do servidor simulado (sessão se houver, senão o do visitante). */
export async function serverCart(page: Page): Promise<{ editionId: string; quantity: number }[]> {
  await mockReady(page);
  return page.evaluate(
    async ({ url, sessionKey, guestKey }) => {
      const raw = localStorage.getItem(sessionKey);
      const token = raw ? (JSON.parse(raw) as { token: string }).token : null;
      const headers: Record<string, string> = { 'X-Guest-Cart': localStorage.getItem(guestKey) ?? '' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`serverCart → ${response.status}`);
      const cart = (await response.json()) as { items: { editionId: string; quantity: number }[] };
      return cart.items.map(({ editionId, quantity }) => ({ editionId, quantity }));
    },
    { url: `${API_BASE}/cart`, sessionKey: SESSION_STORAGE_KEY, guestKey: GUEST_CART_STORAGE_KEY },
  );
}

export type ServerQuote = {
  subtotal: string;
  discount: string;
  networkFee: string;
  total: string;
  coupon: { code: string } | null;
};

/** Cotação nova do carrinho atual (mesmos headers do app) — referência para conferir o resumo. */
export async function serverQuote(page: Page, network = 'ethereum'): Promise<ServerQuote> {
  await mockReady(page);
  return page.evaluate(
    async ({ url, sessionKey, guestKey, body }) => {
      const raw = localStorage.getItem(sessionKey);
      const token = raw ? (JSON.parse(raw) as { token: string }).token : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Guest-Cart': localStorage.getItem(guestKey) ?? '',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(url, { method: 'POST', headers, body });
      if (!response.ok) throw new Error(`serverQuote → ${response.status}`);
      return (await response.json()) as ServerQuote;
    },
    {
      url: `${API_BASE}/quotes`,
      sessionKey: SESSION_STORAGE_KEY,
      guestKey: GUEST_CART_STORAGE_KEY,
      body: JSON.stringify({ network }),
    },
  );
}

// ——— Tempo real (socket simulado) ———

export type NftChange = { editionId?: string; price?: string; available?: number };
type Emitted = { delivered: number; event: { eventId: string; version: number } | null };

/** Muda preço/estoque no banco simulado; o mock emite `nft.updated` pelo socket. */
export async function emitNftUpdate(page: Page, nftId: string, change: NftChange): Promise<Emitted> {
  return (await mockControl(page, `/__mock/nfts/${nftId}/update`, change)) as Emitted;
}

/** Reenvia o último evento emitido, com o mesmo `eventId` (reentrega). */
export async function replayLastEvent(page: Page): Promise<Emitted> {
  return (await mockControl(page, '/__mock/socket/replay-last', {})) as Emitted;
}

/** Emite um `nft.updated` com versão anterior à atual (e preço 0.01) — chegada fora de ordem. */
export async function emitStaleNftEvent(page: Page, nftId: string): Promise<Emitted> {
  return (await mockControl(page, '/__mock/socket/emit-stale', { nftId })) as Emitted;
}

/** Derruba o socket; com `holdMs`, recusa reconexões por esse tempo. */
export async function dropSocket(page: Page, opts: { holdMs?: number } = {}): Promise<void> {
  await mockControl(page, '/__mock/socket/drop', opts);
}

/** Espera o socket da página conectar (autenticado, se pedido) antes de emitir eventos. */
export async function waitForRealtime(page: Page, opts: { authenticated?: boolean } = {}): Promise<void> {
  await expect
    .poll(async () => {
      const { connections } = (await mockControl(page, '/__mock/socket')) as {
        connections: { userId: string | null }[];
      };
      return connections.some((c) => !opts.authenticated || c.userId !== null);
    })
    .toBe(true);
}
