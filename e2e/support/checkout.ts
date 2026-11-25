import type { Page } from '@playwright/test';

import { expect } from './fixtures';
import { mockControl } from './mock';

export const checkoutSummary = (page: Page) => page.getByRole('complementary', { name: 'Seus NFTs' });
export const reviewDialog = (page: Page) => page.getByRole('dialog', { name: 'Revise sua compra' });
export const orderStatus = (page: Page) => page.getByTestId('order-status');

/** Abre a revisão no checkout (carteira principal pré-selecionada e conectada). */
export async function openReview(page: Page): Promise<void> {
  await page.goto('/checkout');
  await expect(page.getByRole('form', { name: 'Perfil do colecionador' }).getByLabel('Rede')).toHaveValue(
    'ethereum',
  );
  await checkoutSummary(page).getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  await expect(reviewDialog(page).getByTestId('review-total')).toBeVisible();
}

/** Checkout → revisão → confirmar; devolve o id do pedido criado (tela de status). */
export async function placeOrder(page: Page): Promise<string> {
  await openReview(page);
  await reviewDialog(page).getByRole('button', { name: 'Confirmar compra' }).click();
  await expect(page).toHaveURL(/\/pedido\/order-/, { timeout: 30_000 });
  return new URL(page.url()).pathname.split('/').pop()!;
}

type MockOrders = { orders: { id: string; status: string; userId: string }[] };

/** Pedidos no banco simulado (`GET /__mock/state`). */
export async function mockOrders(page: Page): Promise<MockOrders['orders']> {
  return ((await mockControl(page, '/__mock/state')) as MockOrders).orders;
}
