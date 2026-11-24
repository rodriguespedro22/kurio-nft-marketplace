import type { Locator, Page } from '@playwright/test';

import { loginViaUi, logoutViaUi, submitLogin, USERS } from './support/auth';
import { expect, test } from './support/fixtures';
import { bootScenario, serverFavoriteIds, setNetwork } from './support/mock';

const IVORY_ID = 'nft-ivory-baron-088';
const IVORY = `/nft/${IVORY_ID}`;
const ERROR_MESSAGE = 'Não foi possível atualizar favoritos';

/** Botão "Favoritar" do bloco de compra (os cards de "Mais da coleção" têm o nome do NFT). */
const detailFavorite = (page: Page) => page.getByRole('button', { name: 'Favoritar', exact: true });

/** Registra toda mudança de `aria-pressed` do botão — o rollback offline é rápido demais para polling. */
async function recordPressed(button: Locator): Promise<() => Promise<string[]>> {
  await button.evaluate((el) => {
    const log: string[] = [];
    (window as unknown as { __pressedLog: string[] }).__pressedLog = log;
    new MutationObserver(() => log.push(el.getAttribute('aria-pressed') ?? '')).observe(el, {
      attributes: true,
      attributeFilter: ['aria-pressed'],
    });
  });
  return () => button.page().evaluate(() => (window as unknown as { __pressedLog: string[] }).__pressedLog);
}

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

test('logado: favoritar marca na hora (otimista), salva no servidor e o reload mantém', async ({ page }) => {
  await loginViaUi(page, USERS.colecionador, IVORY);
  const button = detailFavorite(page);
  await expect(button).toHaveAttribute('aria-pressed', 'false');

  // Rede lenta (2,5 s): o botão já aparece pressionado bem antes da resposta.
  await setNetwork(page, 'slow');
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true', { timeout: 1_000 });
  await expect.poll(() => serverFavoriteIds(page), { timeout: 10_000 }).toEqual([IVORY_ID]);

  await setNetwork(page, 'normal');
  await page.reload();
  await expect(detailFavorite(page)).toHaveAttribute('aria-pressed', 'true');
});

test('sem rede: fica pressionado, volta atrás e avisa; com rede de novo, persiste', async ({ page }) => {
  await loginViaUi(page, USERS.colecionador, IVORY);
  const button = detailFavorite(page);
  await expect(button).toHaveAttribute('aria-pressed', 'false');

  const pressedLog = await recordPressed(button);
  await setNetwork(page, 'offline');
  await button.click();

  await expect(page.getByRole('alert').filter({ hasText: ERROR_MESSAGE })).toHaveCount(1);
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  expect(await pressedLog()).toEqual(['true', 'false']);

  await setNetwork(page, 'normal');
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => serverFavoriteIds(page)).toEqual([IVORY_ID]);
  await page.reload();
  await expect(detailFavorite(page)).toHaveAttribute('aria-pressed', 'true');
});

test('troca de usuário: os favoritos de A não aparecem para B', async ({ page }) => {
  await loginViaUi(page, USERS.colecionador, IVORY);
  await detailFavorite(page).click();
  await expect.poll(() => serverFavoriteIds(page)).toEqual([IVORY_ID]);

  await logoutViaUi(page);
  await loginViaUi(page, USERS.ana, IVORY);
  await expect(detailFavorite(page)).toHaveAttribute('aria-pressed', 'false');

  await page.goto('/favoritos');
  await expect(page.getByRole('heading', { level: 1, name: 'Favoritos' })).toBeVisible();
  await expect(page.getByText('Nenhum favorito ainda')).toBeVisible();
});

test('deslogado: favoritar leva ao login e volta para o NFT', async ({ page }) => {
  await page.goto(IVORY);
  await detailFavorite(page).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fnft%2Fnft-ivory-baron-088$/);

  await submitLogin(page, USERS.colecionador);
  await expect(page).toHaveURL(IVORY);
  await expect(detailFavorite(page)).toHaveAttribute('aria-pressed', 'false');
});

test('card do catálogo favorita; a página Favoritos lista e permite remover', async ({ page, isMobile }) => {
  await loginViaUi(page, USERS.colecionador, '/?q=ivory%20baron');
  const card = page.getByRole('button', { name: 'Favoritar Ivory Baron #088' });
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => serverFavoriteIds(page)).toEqual([IVORY_ID]);

  // Atalho: barra inferior no mobile, "Lista de interesse" no rodapé no desktop.
  if (isMobile)
    await page.getByRole('navigation', { name: 'Atalhos' }).getByRole('link', { name: 'Favoritos' }).click();
  else await page.getByRole('contentinfo').getByRole('link', { name: 'Lista de interesse' }).click();

  await expect(page).toHaveURL('/favoritos');
  await expect(page).toHaveTitle('Favoritos · Kurio');
  const list = page.getByRole('list', { name: 'NFTs favoritos' });
  await expect(list.getByRole('heading', { name: 'Ivory Baron #088' })).toBeVisible();

  await list.getByRole('button', { name: 'Favoritar Ivory Baron #088' }).click();
  await expect(page.getByText('Nenhum favorito ainda')).toBeVisible();
  await expect.poll(() => serverFavoriteIds(page)).toEqual([]);
});
