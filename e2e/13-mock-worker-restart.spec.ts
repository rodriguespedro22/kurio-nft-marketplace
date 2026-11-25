import type { Page } from '@playwright/test';

import { submitLogin, USERS } from './support/auth';
import { expect, test } from './support/fixtures';
import { bootScenario } from './support/mock';

/**
 * O navegador encerra o Service Worker ocioso (aba em segundo plano, economia de energia) e o religa no
 * próximo evento. O worker do MSW esquecia a aba nesse reinício e deixava a API ir para a rede; o
 * public/mock-sw.js a readota. Aqui o reinício é forçado pelo DevTools no meio da sessão, sem recarregar.
 */
async function restartServiceWorker(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');
  await cdp.detach();
}

const mockApiContentType = (page: Page) =>
  page.evaluate(async () => (await fetch('/api/__mock/state')).headers.get('content-type'));

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

test('API simulada continua respondendo depois que o navegador reinicia o worker', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status').filter({ hasText: 'NFTs encontrados' })).toBeVisible();

  await restartServiceWorker(page);
  expect(await mockApiContentType(page)).toContain('application/json');

  // Login pela interface, sem recarregar: o POST passa pelo worker reiniciado.
  await page.getByRole('banner').getByRole('link', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/login/);
  await submitLogin(page, USERS.colecionador);
  await expect(page.getByRole('banner')).toContainText(USERS.colecionador.displayName);
});
