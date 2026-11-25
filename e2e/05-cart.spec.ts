import type { Page } from '@playwright/test';

import { submitLogin, USERS } from './support/auth';
import { addFromDetail, cartList, cartShortcut, expectSummary, summary } from './support/cart';
import { expect, test } from './support/fixtures';
import { bootScenario, serverCart, serverQuote, setNetwork } from './support/mock';

const IVORY = '/nft/nft-ivory-baron-088';
const GOLDEN_BEAT = '/nft/nft-golden-beat-207';
const IVORY_1_10 = 'nft-ivory-baron-088-1-10'; // 5 disponíveis
const GOLDEN_1_50 = 'nft-golden-beat-207-1-50';

const IVORY_LINE = 'Ivory Baron #088 (edição 1/10)';
const GOLDEN_LINE = 'Golden Beat #207 (edição 1/50)';

const quantityOf = (page: Page, line: string) => page.getByRole('textbox', { name: `Quantidade de ${line}` });

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

// ——— Parte 2: resumo (cotação do servidor) e cupom ———

const couponInput = (page: Page) => page.getByRole('textbox', { name: 'Código promocional' });

async function cartWithTwoItems(page: Page) {
  await addFromDetail(page, IVORY, /1\/10/);
  await addFromDetail(page, GOLDEN_BEAT, /1\/50/);
  await page.goto('/carrinho');
}

test('resumo: Subtotal, Desconto, Taxa de rede e Total iguais à cotação da API', async ({ page }) => {
  await cartWithTwoItems(page);
  await expect(summary(page).getByText('Subtotal')).toBeVisible();
  await expect(summary(page).getByText('Taxa estimada')).toBeVisible();
  await expectSummary(page, await serverQuote(page));

  // Mudar a quantidade gera nova cotação.
  await page.getByRole('button', { name: `Aumentar quantidade de ${IVORY_LINE}` }).click();
  await expect.poll(() => serverCart(page)).toContainEqual({ editionId: IVORY_1_10, quantity: 2 });
  await expectSummary(page, await serverQuote(page));
});

test('cupom KURIO10: aplica, mostra "Remover cupom", reload mantém e remover volta o total', async ({
  page,
}) => {
  await cartWithTwoItems(page);
  const before = await serverQuote(page);
  await expectSummary(page, before);

  await couponInput(page).fill('kurio10');
  await summary(page).getByRole('button', { name: 'Aplicar' }).click();
  await expect(summary(page).getByRole('button', { name: 'Remover cupom' })).toBeVisible();
  await expect(summary(page)).toContainText('KURIO10');
  const withCoupon = await serverQuote(page);
  expect(withCoupon.coupon?.code).toBe('KURIO10');
  await expectSummary(page, withCoupon);

  await page.reload();
  await expect(summary(page).getByRole('button', { name: 'Remover cupom' })).toBeVisible();
  await expectSummary(page, withCoupon);

  await summary(page).getByRole('button', { name: 'Remover cupom' }).click();
  await expect(couponInput(page)).toBeVisible();
  await expect(couponInput(page)).toBeFocused();
  await expectSummary(page, before);
});

test('cupom expirado e inválido: mensagem no próprio campo', async ({ page }) => {
  await cartWithTwoItems(page);
  const input = couponInput(page);
  const errorText = async () => {
    const ids = ((await input.getAttribute('aria-describedby')) ?? '').split(' ').filter(Boolean);
    return Promise.all(ids.map((id) => page.locator(`[id="${id}"]`).innerText()));
  };

  await input.fill('EXPIRADO10');
  await input.press('Enter');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect.poll(errorText).toContain('Cupom expirado');

  await input.fill('XYZ');
  await summary(page).getByRole('button', { name: 'Aplicar' }).click();
  await expect.poll(errorText).toContain('Cupom inválido');
  await expect(summary(page).getByRole('button', { name: 'Remover cupom' })).toHaveCount(0);
});

test('slow-network: skeleton do resumo até a cotação chegar', async ({ page }) => {
  await cartWithTwoItems(page);
  await expect(summary(page).getByTestId('summary-total')).toBeVisible();

  await setNetwork(page, 'slow');
  await page.reload();
  await expect(page.getByTestId('order-summary-skeleton')).toBeVisible();
  await expect(summary(page).getByTestId('summary-total')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('order-summary-skeleton')).toHaveCount(0);
});

test('carrinho do card soma unidades sem sair da lista', async ({ page, isMobile }) => {
  test.skip(
    isMobile,
    'as ações do card (carrinho, ver) aparecem no hover do desktop; no celular fica o coração',
  );
  await page.goto('/?q=Ivory');
  const add = page.getByRole('button', { name: 'Adicionar Ivory Baron #088 ao carrinho' });
  await page.getByRole('article').filter({ has: add }).hover();

  for (let i = 1; i <= 3; i++) {
    await add.click();
    await expect(cartShortcut(page, false)).toHaveAccessibleName(
      `Carrinho, ${i} ${i === 1 ? 'item' : 'itens'}`,
    );
  }
  await expect(page).toHaveURL(/\/\?q=Ivory$/);
  await expect(page.getByText(/Ivory Baron #088 · edição .+ · 3 no carrinho/)).toBeVisible();
  await expect.poll(async () => (await serverCart(page)).map((line) => line.quantity)).toEqual([3]);

  await cartShortcut(page, false).click();
  await expect(cartList(page).getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: /^Quantidade de Ivory Baron #088/ })).toHaveValue('3');
});
