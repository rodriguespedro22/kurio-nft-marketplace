import type { Page } from '@playwright/test';

import { addFromDetail, cartList, expectSummary, summary } from './support/cart';
import { expect, test } from './support/fixtures';
import { bootScenario, emitNftUpdate, serverQuote, waitForRealtime } from './support/mock';

const IVORY_ID = 'nft-ivory-baron-088';
const IVORY = `/nft/${IVORY_ID}`;
const IVORY_1_10 = `${IVORY_ID}-1-10`;

const changeNotice = (page: Page) => page.getByRole('alert', { name: 'Seu carrinho mudou' });

/** Marca a página: se ela recarregar, a marca some. */
async function markPage(page: Page) {
  await page.evaluate(() => Object.assign(window, { __semReload: true }));
}
async function expectNoReload(page: Page) {
  expect(await page.evaluate(() => (window as { __semReload?: boolean }).__semReload)).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

// ——— Parte 1: nft.updated ———

test('detalhe aberto: o preço novo chega pelo socket, sem reload', async ({ page }) => {
  await page.goto(IVORY);
  await expect(page.getByTestId('nft-price')).toHaveText('1.79 ETH');
  await waitForRealtime(page);
  await markPage(page);

  await emitNftUpdate(page, IVORY_ID, { price: '3.10' });
  await expect(page.getByTestId('nft-price')).toHaveText('3.10 ETH');
  await expectNoReload(page);
});

test('catálogo aberto: o card atualiza o preço sem reload', async ({ page }) => {
  await page.goto('/');
  const grid = page.getByRole('list', { name: 'NFTs do catálogo' });
  await expect(grid).toHaveAttribute('aria-busy', 'false');
  const firstCard = grid.getByRole('listitem').first();
  const href = await firstCard.getByRole('link').first().getAttribute('href');
  const nftId = href!.split('/').pop()!;
  await waitForRealtime(page);
  await markPage(page);

  await emitNftUpdate(page, nftId, { price: '9.99' });
  await expect(firstCard).toContainText('9.99 ETH');
  await expectNoReload(page);
});

test('NFT no carrinho: aviso de preço e de esgotado, resumo com o novo total', async ({ page }) => {
  await addFromDetail(page, IVORY, /1\/10/);
  await page.goto('/carrinho');
  await expect(summary(page).getByTestId('summary-total')).toBeVisible();
  await waitForRealtime(page);

  await emitNftUpdate(page, IVORY_ID, { editionId: IVORY_1_10, price: '3.10' });
  await expect(changeNotice(page)).toContainText(
    /Preço de Ivory Baron #088 \(edição 1\/10\) mudou de [\d.]+ ETH para 3\.10 ETH/,
  );
  await expect(cartList(page)).toContainText('3.10 ETH');
  await expectSummary(page, await serverQuote(page));
  expect((await serverQuote(page)).subtotal).toBe('3.1');

  await emitNftUpdate(page, IVORY_ID, { editionId: IVORY_1_10, available: 0 });
  await expect(changeNotice(page)).toContainText('Ivory Baron #088 (edição 1/10) esgotou');
  await expect(summary(page).getByRole('note')).toContainText('mudaram de preço ou de disponibilidade');
});
