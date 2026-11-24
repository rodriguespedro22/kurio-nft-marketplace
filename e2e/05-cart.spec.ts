import type { Page } from '@playwright/test';

import { submitLogin, USERS } from './support/auth';
import { expect, test } from './support/fixtures';
import { bootScenario, serverCart } from './support/mock';

const IVORY = '/nft/nft-ivory-baron-088';
const GOLDEN_BEAT = '/nft/nft-golden-beat-207';
const IVORY_1_10 = 'nft-ivory-baron-088-1-10'; // 5 disponíveis
const GOLDEN_1_50 = 'nft-golden-beat-207-1-50';

const IVORY_LINE = 'Ivory Baron #088 (edição 1/10)';
const GOLDEN_LINE = 'Golden Beat #207 (edição 1/50)';

/** Atalho do carrinho: no header (desktop) ou na barra inferior (mobile). */
function cartShortcut(page: Page, isMobile: boolean) {
  const area = isMobile ? page.getByRole('navigation', { name: 'Atalhos' }) : page.getByRole('banner');
  return area.getByRole('link', { name: /^Carrinho/ });
}

const cartList = (page: Page) => page.getByRole('list', { name: 'Itens do carrinho' });
const quantityOf = (page: Page, line: string) => page.getByRole('textbox', { name: `Quantidade de ${line}` });

async function addFromDetail(page: Page, path: string, edition: RegExp) {
  await page.goto(path);
  await page.getByRole('radiogroup', { name: 'Edição' }).getByRole('radio', { name: edition }).click();
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await expect(page.getByText('Adicionado ao carrinho')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

test('visitante: adicionar, alterar, remover; contador e reload acompanham', async ({ page, isMobile }) => {
  await addFromDetail(page, IVORY, /1\/10/);
  // No celular o detalhe troca a barra inferior pela barra de compra (layout): o contador é conferido fora dele.
  if (!isMobile) await expect(cartShortcut(page, isMobile)).toHaveAccessibleName('Carrinho, 1 item');
  await addFromDetail(page, GOLDEN_BEAT, /1\/50/);
  if (isMobile) await page.goto('/');
  await expect(cartShortcut(page, isMobile)).toHaveAccessibleName('Carrinho, 2 itens');

  await cartShortcut(page, isMobile).click();
  await expect(page).toHaveURL('/carrinho');
  await expect(page).toHaveTitle('Carrinho · Kurio');
  await expect(cartList(page).getByRole('listitem')).toHaveCount(2);

  await page.getByRole('button', { name: `Aumentar quantidade de ${IVORY_LINE}` }).click();
  await expect(quantityOf(page, IVORY_LINE)).toHaveValue('2');
  await expect(cartShortcut(page, isMobile)).toHaveAccessibleName('Carrinho, 3 itens');

  await page.getByRole('button', { name: `Remover ${GOLDEN_LINE} do carrinho` }).click();
  await expect(cartList(page).getByRole('listitem')).toHaveCount(1);
  await expect(cartShortcut(page, isMobile)).toHaveAccessibleName('Carrinho, 2 itens');
  await expect.poll(() => serverCart(page)).toEqual([{ editionId: IVORY_1_10, quantity: 2 }]);

  await page.reload();
  await expect(cartList(page).getByRole('listitem')).toHaveCount(1);
  await expect(quantityOf(page, IVORY_LINE)).toHaveValue('2');
});

test('COMPRAR adiciona e leva ao carrinho', async ({ page }) => {
  await page.goto(GOLDEN_BEAT);
  await page.getByRole('button', { name: /^Comprar/ }).click();
  await expect(page).toHaveURL('/carrinho');
  await expect(cartList(page).getByRole('heading', { name: 'Golden Beat #207' })).toBeVisible();
});

test('login: os itens do visitante continuam no carrinho do usuário', async ({ page, isMobile }) => {
  await addFromDetail(page, IVORY, /1\/10/);
  await addFromDetail(page, GOLDEN_BEAT, /1\/50/);

  await page.goto('/login?redirect=%2Fcarrinho');
  await submitLogin(page, USERS.colecionador);
  await expect(page).toHaveURL('/carrinho');
  await expect(cartList(page).getByRole('listitem')).toHaveCount(2);
  await expect(cartShortcut(page, isMobile)).toHaveAccessibleName('Carrinho, 2 itens');
  await expect
    .poll(() => serverCart(page))
    .toEqual([
      { editionId: IVORY_1_10, quantity: 1 },
      { editionId: GOLDEN_1_50, quantity: 1 },
    ]);
});

test('quantidade acima do disponível é limitada, com mensagem', async ({ page }) => {
  await addFromDetail(page, IVORY, /1\/10/);
  await page.goto('/carrinho');
  const input = quantityOf(page, IVORY_LINE);
  await input.fill('99');
  await input.press('Enter');
  await expect(input).toHaveValue('5');
  await expect(cartList(page).getByText('Máximo disponível: 5')).toBeVisible();
  await expect.poll(() => serverCart(page)).toEqual([{ editionId: IVORY_1_10, quantity: 5 }]);
});

test('duplo clique rápido em "+" não passa do disponível', async ({ page }) => {
  await addFromDetail(page, IVORY, /1\/10/);
  await page.goto('/carrinho');
  const input = quantityOf(page, IVORY_LINE);
  await input.fill('4');
  await input.press('Enter');
  await expect.poll(() => serverCart(page)).toEqual([{ editionId: IVORY_1_10, quantity: 4 }]);

  await page.getByRole('button', { name: `Aumentar quantidade de ${IVORY_LINE}` }).dblclick();
  await expect(input).toHaveValue('5');
  await expect.poll(() => serverCart(page)).toEqual([{ editionId: IVORY_1_10, quantity: 5 }]);
  await page.reload();
  await expect(quantityOf(page, IVORY_LINE)).toHaveValue('5');
});

test('carrinho vazio explica e leva ao catálogo', async ({ page }) => {
  await page.goto('/carrinho');
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible();
  await page.getByRole('link', { name: 'Explorar o catálogo' }).click();
  await expect(page).toHaveURL(/\/#catalogo$/);
});
