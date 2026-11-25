import type { Locator, Page } from '@playwright/test';

import { expect, test } from './support/fixtures';
import { bootScenario, mockControl } from './support/mock';

const grid = (page: Page) => page.getByRole('list', { name: 'NFTs do catálogo' });
const cards = (page: Page) => grid(page).getByRole('listitem');
const cardNames = (page: Page) => grid(page).getByRole('heading', { level: 3 }).allInnerTexts();

/** Preços dos cards em ETH (número), na ordem exibida. */
async function cardPrices(page: Page): Promise<number[]> {
  const texts = await grid(page).getByTestId('nft-card-price').allInnerTexts();
  return texts.map((t) => Number.parseFloat(t));
}

/** Filtros: sidebar no desktop; drawer "Filtros" no mobile. */
async function openFilters(page: Page, isMobile: boolean): Promise<Locator> {
  if (!isMobile) return page.getByRole('complementary', { name: 'Filtros' });
  await page.getByRole('button', { name: 'Filtros', exact: true }).click();
  return page.getByRole('dialog', { name: 'Filtros' });
}

async function closeFilters(page: Page, isMobile: boolean) {
  if (isMobile) await page.keyboard.press('Escape');
}

const searchBox = (page: Page) => page.getByRole('searchbox', { name: 'Buscar NFTs' });

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

test('busca por "baron" vai para a URL e mostra só cards com "Baron"', async ({ page }) => {
  await page.goto('/');
  await expect(cards(page)).toHaveCount(9);

  await searchBox(page).fill('baron');
  await expect(page).toHaveURL(/[?&]q=baron/);
  await expect.poll(async () => (await cardNames(page)).length).toBeGreaterThan(0);
  await expect.poll(async () => (await cardNames(page)).every((n) => /baron/i.test(n))).toBe(true);
});

test('2 categorias + menor preço: URL guarda tudo e os preços ficam em ordem', async ({ page, isMobile }) => {
  await page.goto('/');
  const filters = await openFilters(page, isMobile);
  await filters.getByRole('checkbox', { name: /^Arte digital/ }).check();
  await filters.getByRole('checkbox', { name: /^Música/ }).check();
  await closeFilters(page, isMobile);
  await page.getByLabel('Ordenar por').selectOption({ label: 'Menor preço' });

  await expect(page).toHaveURL(/arte-digital/);
  await expect(page).toHaveURL(/musica/);
  await expect(page).toHaveURL(/sort=price_asc/);

  await expect
    .poll(async () => {
      const prices = await cardPrices(page);
      return prices.length > 0 && prices.every((p, i) => i === 0 || prices[i - 1]! <= p);
    })
    .toBe(true);
});

test('página 2 + novo filtro zera page; voltar restaura; reload preserva', async ({ page, isMobile }) => {
  await page.goto('/');
  const pagination = page.getByRole('navigation', { name: 'Paginação' });
  await pagination.getByRole('link', { name: 'Página 2', exact: true }).click();
  await expect(page).toHaveURL(/[?&]page=2/);
  // O grid anterior fica na tela (aria-busy) até a página 2 chegar.
  await expect(grid(page)).toHaveAttribute('aria-busy', 'false');
  const page2Names = await cardNames(page);

  const filters = await openFilters(page, isMobile);
  await filters.getByRole('checkbox', { name: /^Polygon/ }).check();
  await closeFilters(page, isMobile);
  await expect(page).toHaveURL(/polygon/);
  await expect(page).not.toHaveURL(/page=/);

  await page.goBack();
  await expect(page).toHaveURL(/[?&]page=2/);
  await expect(page).not.toHaveURL(/polygon/);
  await expect.poll(() => cardNames(page)).toEqual(page2Names);

  await page.reload();
  await expect(page).toHaveURL(/[?&]page=2/);
  await expect.poll(() => cardNames(page)).toEqual(page2Names);
});

test('cenário empty-catalog: "Nenhum NFT encontrado" com "Limpar filtros"', async ({ page }) => {
  await bootScenario(page, 'empty-catalog');
  await page.goto('/?q=qualquer');
  await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page).not.toHaveURL(/q=/);
});

test('cenário out-of-order: a resposta atrasada de "a" não sobrescreve "ivory"', async ({ page }) => {
  await bootScenario(page, 'out-of-order');
  await page.goto('/');
  await expect(cards(page)).toHaveCount(9, { timeout: 10_000 });

  await searchBox(page).fill('a');
  await expect(page).toHaveURL(/[?&]q=a(&|$)/);
  await searchBox(page).fill('ivory');
  await expect(page).toHaveURL(/[?&]q=ivory/);

  // "ivory" casa nome, coleção ou criador: o esperado é a 1ª página que a API devolve para "ivory".
  const expected = await mockControl(page, '/nfts?q=ivory').then((body) =>
    (body as { items: { name: string }[] }).items.map((item) => item.name),
  );
  expect(expected.length).toBeGreaterThan(0);
  await expect.poll(() => cardNames(page), { timeout: 10_000 }).toEqual(expected);

  // Depois que a resposta lenta de "a" chega, o grid continua com o resultado de "ivory".
  await page.waitForTimeout(2000);
  expect(await cardNames(page)).toEqual(expected);
  await expect(searchBox(page)).toHaveValue('ivory');
});

test('cenário slow-network: 9 skeletons com a mesma altura do card final', async ({ page }) => {
  await bootScenario(page, 'slow-network');
  await page.goto('/');

  const skeletons = page.getByTestId('nft-card-skeleton');
  await expect(skeletons).toHaveCount(9);
  await expect(skeletons.first()).toBeVisible();
  const skeletonHeight = (await skeletons.first().boundingBox())?.height ?? 0;

  await expect(cards(page)).toHaveCount(9, { timeout: 15_000 });
  const cardHeight = (await cards(page).first().boundingBox())?.height ?? 0;
  expect(skeletonHeight).toBeGreaterThan(100);
  expect(Math.abs(cardHeight - skeletonHeight)).toBeLessThanOrEqual(1);
});

test('mobile: filtros em drawer, foco preso, Escape fecha e devolve o foco a "Filtros"', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'drawer de filtros só abaixo de 1280 px');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Filtros', exact: true });
  await trigger.click();

  const drawer = page.getByRole('dialog', { name: 'Filtros' });
  await expect(drawer).toBeVisible();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('abas e cards: "Em alta" vai para a URL e o card leva ao detalhe', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Abas do catálogo' })
    .getByRole('link', { name: 'Em alta' })
    .click();
  await expect(page).toHaveURL(/tab=trending/);
  // A grade da aba anterior fica na tela (aria-busy) até "Em alta" chegar.
  await expect(grid(page)).toHaveAttribute('aria-busy', 'false');
  await expect(cards(page).first()).toBeVisible();

  const first = cards(page).first();
  const name = await first.getByRole('heading', { level: 3 }).innerText();
  await first.getByRole('link').first().click();
  await expect(page).toHaveURL(/\/nft\/nft-/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
});
