import type { Page } from '@playwright/test';

import { expect, test } from './support/fixtures';
import { bootScenario } from './support/mock';

const IVORY = '/nft/nft-ivory-baron-088';
const GOLDEN_BEAT = '/nft/nft-golden-beat-207';

const mainImage = (page: Page) => page.getByTestId('nft-main-image').locator('img');
const quantity = (page: Page) => page.getByRole('textbox', { name: 'Quantidade' });

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

test('acesso direto + reload: nome, preço e título da página', async ({ page, isMobile }) => {
  await page.goto(IVORY);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ivory Baron #088');
  await expect(page.getByTestId('nft-price')).toHaveText('1.79 ETH');
  await expect(page).toHaveTitle('Ivory Baron #088 · Kurio');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ivory Baron #088');
  // Desktop: trilha "Início / Mercado"; mobile: botão "Voltar" (layout).
  if (isMobile) await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible();
  else await expect(page.getByRole('navigation', { name: 'Trilha de navegação' })).toContainText('Mercado');
});

test('galeria: miniatura troca a arte principal e as setas navegam', async ({ page }) => {
  await page.goto(IVORY);
  const thumbs = page.getByRole('tablist', { name: 'Imagens do NFT' }).getByRole('tab');
  await expect(thumbs).toHaveCount(3);
  await expect(mainImage(page)).toHaveAttribute('src', /ape-ivory-a-/);

  await thumbs.nth(1).click();
  await expect(thumbs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(mainImage(page)).toHaveAttribute('src', /ape-ivory-b-/);

  await page.keyboard.press('ArrowRight');
  await expect(thumbs.nth(2)).toBeFocused();
  await expect(thumbs.nth(2)).toHaveAttribute('aria-selected', 'true');
  await expect(mainImage(page)).toHaveAttribute('src', /ape-ivory-c-/);

  await page.keyboard.press('ArrowRight'); // volta ao início
  await expect(thumbs.nth(0)).toBeFocused();
  await expect(mainImage(page)).toHaveAttribute('src', /ape-ivory-a-/);
});

test('NFT inexistente: "NFT não encontrado" com link para o catálogo', async ({ page }) => {
  await page.goto('/nft/nao-existe');
  await expect(page.getByRole('heading', { level: 1, name: 'NFT não encontrado' })).toBeVisible();
  await expect(page).toHaveTitle('NFT não encontrado · Kurio');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

  await page.getByRole('link', { name: 'Ver o catálogo' }).click();
  await expect(page).toHaveURL(/\/#catalogo$/);
});

test('edição esgotada: desabilitada e com o texto "Esgotada"', async ({ page }) => {
  await page.goto(GOLDEN_BEAT);
  const editions = page.getByRole('radiogroup', { name: 'Edição' });
  const soldOut = editions.getByRole('radio', { name: /1\/1/ });
  await expect(soldOut).toBeDisabled();
  await expect(soldOut).toContainText('Esgotada');

  // A edição disponível já vem selecionada, com o seu preço.
  await expect(editions.getByRole('radio', { name: /1\/50/ })).toBeChecked();
  await expect(page.getByTestId('nft-price')).toHaveText('0.99 ETH');
});

test('trocar de edição atualiza o preço', async ({ page }) => {
  await page.goto(IVORY);
  await page.getByRole('radiogroup', { name: 'Edição' }).getByRole('radio', { name: /1\/10/ }).click();
  await expect(page.getByTestId('nft-price')).toHaveText('3.58 ETH');
});

test('quantidade: 0 → 1, 2.5 → 2, acima do disponível limita, sempre com aviso no campo', async ({
  page,
}) => {
  await page.goto(IVORY);
  // 1/10 tem 5 disponíveis.
  await page.getByRole('radiogroup', { name: 'Edição' }).getByRole('radio', { name: /1\/10/ }).click();
  const input = quantity(page);

  await input.fill('0');
  await input.press('Tab');
  await expect(input).toHaveValue('1');
  await expect(page.getByText('Mínimo: 1')).toBeVisible();

  await input.fill('2.5');
  await input.press('Tab');
  await expect(input).toHaveValue('2');
  const notice = page.getByText('Use um número inteiro');
  await expect(notice).toBeVisible();
  expect(await input.getAttribute('aria-describedby')).toContain(await notice.getAttribute('id'));

  await input.fill('99');
  await input.press('Enter');
  await expect(input).toHaveValue('5');
  const hint = page.getByText('Máximo disponível: 5');
  await expect(hint).toBeVisible();
  const hintId = await hint.getAttribute('id');
  expect(hintId).toBeTruthy();
  expect(await input.getAttribute('aria-describedby')).toContain(hintId);

  await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled();
  await page.getByRole('button', { name: 'Diminuir quantidade' }).click();
  await expect(input).toHaveValue('4');
});

test('cenário slow-network: skeleton até o NFT chegar', async ({ page }) => {
  await bootScenario(page, 'slow-network');
  await page.goto(IVORY);
  await expect(page.getByTestId('nft-detail-skeleton')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ivory Baron #088', { timeout: 15_000 });
  await expect(page.getByTestId('nft-detail-skeleton')).toHaveCount(0);
});
