import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { loginViaUi, USERS } from './support/auth';
import { addFromDetail } from './support/cart';
import { placeOrder } from './support/checkout';
import { expect, test } from './support/fixtures';
import { bootScenario } from './support/mock';

const IVORY = '/nft/nft-ivory-baron-088';

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

/** Página pronta: nada em carregamento (skeletons e listas marcam `aria-busy`). */
async function settled(page: Page) {
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
}

/**
 * O elemento focado tem contorno visível — nele, no `::after` (cards com link esticado) ou no pai
 * (campos agrupados que desenham o anel com `focus-within`, como a newsletter).
 */
async function focusWithoutOutline(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'body';
    const visible = (style: CSSStyleDeclaration) =>
      style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    const parent = el.parentElement;
    if (
      visible(getComputedStyle(el)) ||
      visible(getComputedStyle(el, '::after')) ||
      (parent?.matches(':focus-within') && visible(getComputedStyle(parent)))
    )
      return null;
    return el.outerHTML.slice(0, 160);
  });
}

/** Sem violações `serious` ou `critical` do axe na página atual. */
async function expectNoSeriousViolations(page: Page, route: string) {
  await settled(page);
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${route}: ${v.id} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
  expect(serious, `violações do axe em ${route}`).toEqual([]);
}

// ——— Teclado ———

test('só com Tab: header → busca e filtros → card, sempre com foco visível', async ({ page, isMobile }) => {
  await page.goto('/');
  await settled(page);
  // `settled` pode passar antes de o catálogo começar a carregar; o percurso precisa dos cards.
  await expect(page.getByRole('list', { name: 'NFTs do catálogo' }).getByRole('link').first()).toBeVisible();

  const reached = { header: false, search: false, filters: false, card: false };
  for (let i = 0; i < 150 && !reached.card; i++) {
    await page.keyboard.press('Tab');
    expect(await focusWithoutOutline(page), `foco visível no Tab ${i + 1}`).toBeNull();
    const where = await page.evaluate(() => {
      const el = document.activeElement!;
      return {
        header: !!el.closest('header'),
        // No desktop a busca abre pela lupa do header (popover); abaixo de 1280 px é o campo.
        search:
          el.getAttribute('type') === 'search' ||
          el.getAttribute('role') === 'searchbox' ||
          el.getAttribute('aria-label') === 'Buscar NFTs',
        filters: !!el.closest('aside[aria-label="Filtros"]') || el.getAttribute('aria-label') === 'Filtros',
        card: !!el.closest('[aria-label="NFTs do catálogo"]'),
      };
    });
    // Header primeiro; busca e filtros em qualquer ordem (no desktop a barra lateral vem antes);
    // o card só conta depois dos dois.
    if (where.header) reached.header = true;
    if (reached.header && where.search) reached.search = true;
    if (reached.header && where.filters) reached.filters = true;
    if (reached.search && reached.filters && where.card) reached.card = true;
  }
  expect(reached, isMobile ? 'mobile: filtros pelo botão da gaveta' : 'desktop').toEqual({
    header: true,
    search: true,
    filters: true,
    card: true,
  });
});

test('diálogo da galeria abre com Enter e fecha com Escape, devolvendo o foco', async ({ page }) => {
  await page.goto(IVORY);
  await settled(page);
  const trigger = page.getByRole('button', { name: 'Ampliar imagem' });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('mobile: gaveta de filtros abre com Enter e fecha com Escape, devolvendo o foco', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'a gaveta de filtros só existe no mobile');
  await page.goto('/');
  await settled(page);
  const trigger = page.getByRole('button', { name: 'Filtros', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
});

// ——— axe ———

test('axe: Início, Detalhe, Carrinho, Login e Cadastro sem violações sérias', async ({ page }) => {
  await addFromDetail(page, IVORY, /1\/10/);
  for (const route of ['/', IVORY, '/carrinho', '/login', '/cadastro']) {
    await page.goto(route);
    await expectNoSeriousViolations(page, route);
  }
});

test('axe: Pagamento, Perfil, Carteiras e Pedido sem violações sérias', async ({ page }) => {
  test.setTimeout(60_000);
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  for (const route of ['/checkout', '/perfil', '/carteiras']) {
    await page.goto(route);
    await expectNoSeriousViolations(page, route);
  }
  await placeOrder(page);
  await expectNoSeriousViolations(page, '/pedido');
});

// ——— Layout ———

const PUBLIC_ROUTES = ['/', IVORY, '/carrinho', '/login', '/cadastro', '/rota-inexistente'];
const PRIVATE_ROUTES = ['/checkout', '/perfil', '/carteiras', '/favoritos'];

async function expectNoHorizontalOverflow(page: Page, routes: string[]) {
  for (const route of routes) {
    await page.goto(route);
    await settled(page);
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth, `${route} a ${innerWidth}px`).toBeLessThanOrEqual(innerWidth);
  }
}

test('sem rolagem horizontal em nenhuma rota', { tag: '@layout' }, async ({ page }) => {
  test.setTimeout(60_000);
  await addFromDetail(page, IVORY, /1\/10/);
  await expectNoHorizontalOverflow(page, PUBLIC_ROUTES);
  await loginViaUi(page, USERS.colecionador);
  await expectNoHorizontalOverflow(page, PRIVATE_ROUTES);
});

test.describe('zoom de 200%', () => {
  // 1440 px a 200% = 720 px de CSS com densidade 2.
  test.use({ viewport: { width: 720, height: 900 }, deviceScaleFactor: 2 });

  test('sem rolagem horizontal a 720 px', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium-desktop', 'zoom simulado uma vez, no desktop');
    test.setTimeout(60_000);
    await addFromDetail(page, IVORY, /1\/10/);
    await expectNoHorizontalOverflow(page, PUBLIC_ROUTES);
    await loginViaUi(page, USERS.colecionador);
    await expectNoHorizontalOverflow(page, PRIVATE_ROUTES);
  });
});
