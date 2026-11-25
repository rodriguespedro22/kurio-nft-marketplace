import type { Page } from '@playwright/test';

import { expect, test } from './support/fixtures';
import { bootScenario } from './support/mock';

const grid = (page: Page) => page.getByRole('list', { name: 'NFTs do catálogo' });
const panelToggle = (page: Page) => page.getByRole('button', { name: 'Cenários', exact: true });
const panel = (page: Page) => page.getByRole('region', { name: 'Painel de cenários' });

// ——— Parte 1: painel de cenários, erro e lentidão ———

test('painel recolhido por padrão; ?panel=0 o esconde', async ({ page }) => {
  await bootScenario(page, 'default');
  await page.goto('/');
  await expect(panelToggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(panel(page)).toHaveCount(0);

  await page.goto('/?panel=0');
  await expect(grid(page)).toHaveAttribute('aria-busy', 'false');
  await expect(panelToggle(page)).toHaveCount(0);
});

test('server-errors: erro com "Tentar novamente"; rede normal pelo painel recupera o grid', async ({
  page,
}) => {
  await bootScenario(page, 'server-errors');
  await page.goto('/');
  const catalog = page.locator('#catalogo');
  // O grid mostra o erro com "Tentar novamente"; a barra lateral (gaveta no mobile) também falha.
  const gridError = catalog.locator('[data-slot="page-error"]');
  await expect(gridError).toContainText('Instabilidade temporária');
  await expect(gridError.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();

  await panelToggle(page).click();
  await expect(panel(page).getByLabel('Cenário', { exact: true })).toHaveValue('server-errors');
  await panel(page).getByLabel('Perfil de rede').selectOption('normal');
  await expect(panel(page).getByLabel('Perfil de rede')).toHaveValue('normal');
  await panelToggle(page).click(); // recolhe o painel antes de voltar ao conteúdo
  await gridError.getByRole('button', { name: 'Tentar novamente' }).click();

  await expect(grid(page).getByRole('listitem').first()).toBeVisible();
  await expect(grid(page)).toHaveAttribute('aria-busy', 'false');
});

test('slow-network: skeletons por pelo menos 2 s, depois o conteúdo', async ({ page }) => {
  // Marca, na própria página, quando o skeleton aparece e quando o 1º card chega.
  await page.addInitScript(() => {
    const marks: { skeleton?: number; content?: number } = {};
    Object.assign(window, { __marks: marks });
    new MutationObserver(() => {
      if (marks.skeleton === undefined && document.querySelector('[data-testid="nft-card-skeleton"]')) {
        marks.skeleton = performance.now();
      }
      if (marks.content === undefined && document.querySelector('[aria-label="NFTs do catálogo"] li')) {
        marks.content = performance.now();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await bootScenario(page, 'slow-network');
  await page.goto('/');

  await expect(grid(page).getByRole('listitem').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('nft-card-skeleton')).toHaveCount(0);
  const marks = await page.evaluate(
    () => (window as { __marks?: { skeleton?: number; content?: number } }).__marks,
  );
  expect(marks?.skeleton).toBeDefined();
  expect(marks!.content! - marks!.skeleton!).toBeGreaterThanOrEqual(2000);
});

test('painel troca o cenário: reset e reload com o cenário novo', async ({ page }) => {
  await bootScenario(page, 'default');
  await page.goto('/');
  await expect(grid(page)).toHaveAttribute('aria-busy', 'false');

  await panelToggle(page).click();
  await panel(page).getByLabel('Cenário', { exact: true }).selectOption('empty-catalog');

  await expect(page.locator('#catalogo')).toContainText(/nenhum nft/i);
  await panelToggle(page).click();
  await expect(panel(page).getByLabel('Cenário', { exact: true })).toHaveValue('empty-catalog');
});
