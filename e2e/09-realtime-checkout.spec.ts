import type { Page } from '@playwright/test';

import { addEth, formatEth } from '../src/shared/money/eth';
import { loginViaUi, USERS } from './support/auth';
import { addFromDetail, cartList, expectSummary, summary } from './support/cart';
import { openReview, reviewDialog } from './support/checkout';
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

/** Testes com `@cenario` sobem o próprio cenário (um boot por teste). */
test.beforeEach(async ({ page }, info) => {
  if (!info.tags.includes('@cenario')) await bootScenario(page, 'default');
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

// ——— Parte 2: cotação desatualizada no checkout ———

const IVORY_LINE = 'Ivory Baron #088 (edição 1/10)';
const GOLDEN_BEAT = '/nft/nft-golden-beat-207';
const quoteDiff = (page: Page) => reviewDialog(page).getByRole('alert');
const confirmNewTotal = (page: Page) =>
  reviewDialog(page).getByRole('button', { name: 'Confirmar novo total' });

async function expectOrderPage(page: Page) {
  await expect(page).toHaveURL(/\/pedido\/order-/, { timeout: 30_000 });
}

test('revisão aberta: preço muda pelo socket → diferença e "Confirmar novo total"', async ({ page }) => {
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  const before = (await serverQuote(page)).subtotal;
  await openReview(page);
  await waitForRealtime(page, { authenticated: true });

  await emitNftUpdate(page, IVORY_ID, { editionId: IVORY_1_10, price: '3.10' });

  await expect(quoteDiff(page)).toContainText(IVORY_LINE);
  await expect(quoteDiff(page)).toContainText(formatEth(before));
  await expect(quoteDiff(page)).toContainText(formatEth('3.10'));
  await expect(reviewDialog(page).getByTestId('review-total')).toHaveText(formatEth('3.116'));
  await expect(reviewDialog(page).getByRole('button', { name: 'Confirmar compra' })).toHaveCount(0);
  await confirmNewTotal(page).click();
  await expectOrderPage(page);
});

test(
  'cenário price-change-during-checkout: o pedido volta QUOTE_STALE e a diferença pede nova confirmação',
  { tag: '@cenario' },
  async ({ page }) => {
    await bootScenario(page, 'price-change-during-checkout');
    await loginViaUi(page, USERS.colecionador);
    await addFromDetail(page, IVORY, /1\/10/);
    const before = (await serverQuote(page)).subtotal;
    await openReview(page);
    await expect(quoteDiff(page)).toHaveCount(0);

    await reviewDialog(page).getByRole('button', { name: 'Confirmar compra' }).click();

    await expect(quoteDiff(page)).toContainText(IVORY_LINE);
    await expect(quoteDiff(page)).toContainText(formatEth(before));
    await expect(quoteDiff(page)).toContainText(formatEth(addEth(before, '0.25')));
    await expect(page).toHaveURL('/checkout');
    await confirmNewTotal(page).click();
    await expectOrderPage(page);
  },
);

test(
  'cenário sold-out-during-checkout: item "Esgotado" bloqueia a compra até ser removido',
  { tag: '@cenario' },
  async ({ page }) => {
    await bootScenario(page, 'sold-out-during-checkout');
    await loginViaUi(page, USERS.colecionador);
    await addFromDetail(page, IVORY, /1\/10/);
    await addFromDetail(page, GOLDEN_BEAT, /1\/50/);
    await openReview(page);

    await reviewDialog(page).getByRole('button', { name: 'Confirmar compra' }).click();

    const items = reviewDialog(page).getByRole('list', { name: 'Itens da compra' });
    const soldOut = items.getByRole('listitem').filter({ hasText: IVORY_LINE });
    await expect(soldOut).toContainText('Esgotado');
    const confirm = reviewDialog(page).getByRole('button', { name: /^Confirmar (compra|novo total)$/ });
    await expect(confirm).toBeDisabled();

    await soldOut.getByRole('button', { name: `Remover ${IVORY_LINE}` }).click();

    await expect(items.getByRole('listitem')).toHaveCount(1);
    await expect(items).not.toContainText('Ivory Baron');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expectOrderPage(page);
  },
);
