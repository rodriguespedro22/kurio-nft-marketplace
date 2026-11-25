import type { Page } from '@playwright/test';

import { formatEth } from '../src/shared/money/eth';
import { loginViaUi, submitLogin, USERS } from './support/auth';
import { addFromDetail } from './support/cart';
import { expect, test } from './support/fixtures';
import { bootScenario, serverQuote } from './support/mock';

const IVORY = '/nft/nft-ivory-baron-088';
const GOLDEN_BEAT = '/nft/nft-golden-beat-207';

const buyerForm = (page: Page) => page.getByRole('form', { name: 'Perfil do colecionador' });
const checkoutSummary = (page: Page) => page.getByRole('complementary', { name: 'Seus NFTs' });
const confirmButton = (page: Page) =>
  checkoutSummary(page).getByRole('button', { name: 'Confirmar compra', exact: true });

/** O resumo do checkout mostra a taxa e o total da cotação da API para a rede. */
async function expectCheckoutSummary(page: Page, network: string) {
  const quote = await serverQuote(page, network);
  const aside = checkoutSummary(page);
  await expect(aside.getByTestId('summary-fee')).toHaveText(formatEth(quote.networkFee));
  await expect(aside.getByTestId('summary-total')).toHaveText(formatEth(quote.total));
  return quote;
}

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

// ——— Parte 1: formulário, carteira/rede e revisão ———

test('visitante: "Conectar e finalizar" pede login e volta ao checkout com o carrinho', async ({ page }) => {
  await addFromDetail(page, IVORY, /1\/10/);
  await page.goto('/carrinho');
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click();

  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/);
  await submitLogin(page, USERS.colecionador);

  await expect(page).toHaveURL('/checkout');
  await expect(page).toHaveTitle('Pagamento · Kurio');
  await expect(checkoutSummary(page).getByRole('listitem')).toHaveCount(1);
  await expect(checkoutSummary(page)).toContainText('Ivory Baron #088');
});

test('sem carteira: link para /carteiras; enviar incompleto marca os campos e foca o primeiro inválido', async ({
  page,
}) => {
  await loginViaUi(page, USERS.ana);
  await addFromDetail(page, GOLDEN_BEAT, /1\/50/);
  await page.goto('/checkout');

  const wallets = page.getByRole('group', { name: 'Carteira e rede' });
  await expect(wallets).toContainText('Você ainda não tem carteira cadastrada.');
  await wallets.getByRole('link', { name: 'Cadastrar carteira' }).click();
  await expect(page).toHaveURL('/carteiras');
  await page.goBack();

  // Nome, usuário e e-mail vêm do perfil; o resto está vazio.
  await expect(buyerForm(page).getByLabel('Nome de exibição')).toHaveValue(USERS.ana.displayName);
  await confirmButton(page).click();

  const network = buyerForm(page).getByLabel('Rede');
  await expect(network).toBeFocused();
  await expect(network).toHaveAttribute('aria-invalid', 'true');
  await expect(network).toHaveAccessibleDescription(/Selecione uma rede/);
  for (const label of ['Nome do perfil', 'Endereço da carteira', 'Tipo de carteira', 'Código de indicação']) {
    await expect(buyerForm(page).getByLabel(label, { exact: true })).toHaveAttribute('aria-invalid', 'true');
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('trocar a rede pede nova cotação: taxa e total mudam', async ({ page }) => {
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  await page.goto('/checkout');

  // A carteira principal (Ethereum) vem marcada e preenche o formulário.
  const wallets = page.getByRole('group', { name: 'Carteira e rede' });
  await expect(wallets.getByRole('radio', { name: /Principal/ })).toBeChecked();
  await expect(buyerForm(page).getByLabel('Rede')).toHaveValue('ethereum');
  const ethereum = await expectCheckoutSummary(page, 'ethereum');
  expect(ethereum.networkFee).toBe('0.016');

  await buyerForm(page).getByLabel('Rede').selectOption('polygon');
  const polygon = await expectCheckoutSummary(page, 'polygon');
  expect(polygon.networkFee).toBe('0.0004');
  expect(polygon.total).not.toBe(ethereum.total);

  // O rascunho (sem dados sensíveis) sobrevive ao reload.
  await page.reload();
  await expect(buyerForm(page).getByLabel('Rede')).toHaveValue('polygon');
  await expectCheckoutSummary(page, 'polygon');
});

test('revisão em diálogo: cotação atual, foco preso, Escape fecha e devolve o foco', async ({ page }) => {
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  await page.goto('/checkout');
  await expect(buyerForm(page).getByLabel('Rede')).toHaveValue('ethereum');
  const quote = await expectCheckoutSummary(page, 'ethereum');

  await confirmButton(page).click();
  const dialog = page.getByRole('dialog', { name: 'Revise sua compra' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Ivory Baron #088');
  await expect(dialog.getByTestId('review-total')).toHaveText(formatEth(quote.total));
  await expect(dialog).toContainText('MetaMask');
  await expect(dialog).toContainText('Ethereum');
  await expect(dialog.getByRole('button', { name: 'Confirmar compra' })).toBeVisible();

  // Tab circula só dentro do diálogo.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(confirmButton(page)).toBeFocused();
});
