import { existsSync } from 'node:fs';

import type { Page, TestInfo } from '@playwright/test';

import { loginViaUi, USERS } from './support/auth';
import { addFromDetail } from './support/cart';
import { expect, test } from './support/fixtures';
import { bootScenario } from './support/mock';

/**
 * Regressão visual (Início, Detalhe, Carrinho, Pagamento × desktop/mobile). As baselines são
 * geradas no container Linux do Playwright (`scripts/visual-update.sh` ou o job `visual-baselines`
 * do CI): fontes e antialiasing mudam entre sistemas, então fora do Linux os testes são pulados.
 */
const FIXED_TIME = '2026-11-24T12:00:00Z';
const UPDATING = process.env.VISUAL_UPDATE === '1';

function needsBaseline(info: TestInfo, name: string) {
  test.skip(process.platform !== 'linux', 'baselines só para Linux (container do Playwright)');
  test.skip(
    !UPDATING && !existsSync(info.snapshotPath(name)),
    `sem baseline ${name}: gere com scripts/visual-update.sh`,
  );
}

async function prepare(page: Page) {
  await page.clock.setFixedTime(FIXED_TIME);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await bootScenario(page, 'default');
}

/** Página pronta e estável: nada carregando, imagens decodificadas, fontes prontas. */
async function settle(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) => (img.complete ? null : img.decode().catch(() => null))),
    );
  });
}

const shot = (page: Page, name: string) =>
  expect(page).toHaveScreenshot(name, { fullPage: true, mask: [page.locator('[data-sonner-toaster]')] });

test('Início', async ({ page }, info) => {
  needsBaseline(info, 'inicio.png');
  await prepare(page);
  await page.goto('/?panel=0');
  await settle(page);
  await shot(page, 'inicio.png');
});

test('Detalhe', async ({ page }, info) => {
  needsBaseline(info, 'detalhe.png');
  await prepare(page);
  await page.goto('/nft/nft-ivory-baron-088?panel=0');
  await settle(page);
  await shot(page, 'detalhe.png');
});

test('Carrinho com 2 itens', async ({ page }, info) => {
  needsBaseline(info, 'carrinho.png');
  await prepare(page);
  await addFromDetail(page, '/nft/nft-ivory-baron-088?panel=0', /1\/10/);
  await addFromDetail(page, '/nft/nft-golden-beat-207?panel=0', /1\/50/);
  await page.goto('/carrinho?panel=0');
  await settle(page);
  await shot(page, 'carrinho.png');
});

test('Pagamento com formulário preenchido', async ({ page }, info) => {
  needsBaseline(info, 'pagamento.png');
  await prepare(page);
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, '/nft/nft-ivory-baron-088?panel=0', /1\/10/);
  await addFromDetail(page, '/nft/nft-golden-beat-207?panel=0', /1\/50/);
  await page.goto('/checkout?panel=0');
  const form = page.getByRole('form', { name: 'Perfil do colecionador' });
  await expect(form.getByLabel('Rede')).toHaveValue('ethereum');
  await form.getByLabel('Observação do colecionador (opcional)').fill('Entregar na carteira principal');
  await page.locator(':focus').blur();
  await settle(page);
  await shot(page, 'pagamento.png');
});
