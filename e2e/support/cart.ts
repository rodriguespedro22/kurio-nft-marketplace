import type { Page } from '@playwright/test';

import { formatEth } from '../../src/shared/money/eth';
import { expect } from './fixtures';
import type { ServerQuote } from './mock';

/** Atalho do carrinho: no header (desktop) ou na barra inferior (mobile). */
export function cartShortcut(page: Page, isMobile: boolean) {
  const area = isMobile ? page.getByRole('navigation', { name: 'Atalhos' }) : page.getByRole('banner');
  return area.getByRole('link', { name: /^Carrinho/ });
}

export const cartList = (page: Page) => page.getByRole('list', { name: 'Itens do carrinho' });

/** Abre o detalhe, escolhe a edição e adiciona ao carrinho (espera o toast de confirmação). */
export async function addFromDetail(page: Page, path: string, edition: RegExp) {
  await page.goto(path);
  await page.getByRole('radiogroup', { name: 'Edição' }).getByRole('radio', { name: edition }).click();
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await expect(page.getByText('Adicionado ao carrinho')).toBeVisible();
}

export const summary = (page: Page) => page.getByRole('complementary', { name: 'Resumo da carteira' });

/** O resumo mostra exatamente os valores da cotação da API. */
export async function expectSummary(page: Page, quote: ServerQuote) {
  const box = summary(page);
  await expect(box.getByTestId('summary-subtotal')).toHaveText(formatEth(quote.subtotal));
  await expect(box.getByTestId('summary-discount')).toHaveText(`(-) ${formatEth(quote.discount)}`);
  await expect(box.getByTestId('summary-fee')).toHaveText(formatEth(quote.networkFee));
  await expect(box.getByTestId('summary-total')).toHaveText(formatEth(quote.total));
}
