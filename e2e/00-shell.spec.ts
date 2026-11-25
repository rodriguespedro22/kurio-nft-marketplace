import type { Locator, Page } from '@playwright/test';

import { expect, test } from './support/fixtures';
import { bootScenario } from './support/mock';

const successToasts = (page: Page) => page.locator('[data-sonner-toast][data-type="success"]');

/** Navegação principal: barra do header no desktop; Sheet "Menu" abaixo de 1280 px. */
async function openMainNav(page: Page, isMobile: boolean): Promise<Locator> {
  if (!isMobile) return page.getByRole('banner').getByRole('navigation', { name: 'Principal' });
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  return page.getByRole('dialog', { name: 'Menu' }).getByRole('navigation', { name: 'Principal' });
}

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

test('rota inexistente mostra "Página não encontrada" com link para o Início', async ({ page }) => {
  await page.goto('/rota-inexistente');

  await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible();
  await expect(page).toHaveTitle(/Página não encontrada/);

  await page.getByRole('main').getByRole('link', { name: 'Voltar para o Início' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/futuro da arte digital/i);
});

test('acesso direto e reload em / funcionam', async ({ page }) => {
  await page.goto('/');
  const hero = page.getByRole('heading', { level: 1 });
  await expect(hero).toContainText(/futuro da arte digital/i);

  await page.reload();
  await expect(hero).toContainText(/futuro da arte digital/i);
  await expect(page).toHaveTitle(/Kurio/);
});

test('header tem Início, Mercado, Criadores e Aprenda; Criadores e Aprenda não fazem nada (fora do escopo)', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');

  let nav = await openMainNav(page, isMobile);
  for (const name of ['Início', 'Mercado']) {
    await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await expect(nav.getByRole('link', { name: 'Início', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );

  // Como no layout, sem tela própria: o clique não navega, não abre nada e não simula sucesso.
  for (const name of ['Criadores', 'Aprenda']) {
    const item = nav.getByText(name, { exact: true });
    await expect(item).toBeVisible();
    await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(0);
    await item.click();
    await expect(page).toHaveURL('/');
    await expect(successToasts(page)).toHaveCount(0);
  }
  if (isMobile) await page.keyboard.press('Escape');

  nav = await openMainNav(page, isMobile);
  await nav.getByRole('link', { name: 'Mercado' }).click();
  await expect(page).toHaveURL(/\/#catalogo$/);
  await expect(page.getByRole('region', { name: 'Catálogo' })).toBeAttached();
  await expect(successToasts(page)).toHaveCount(0);
});

test('não existe tela "Em breve": /em-breve é rota inexistente', async ({ page }) => {
  await page.goto('/em-breve?secao=criadores');
  await expect(page.getByRole('heading', { level: 1, name: 'Em breve' })).toHaveCount(0);
  await expect(page.getByText('Página não encontrada')).toBeVisible();
});

test('newsletter avisa que é "em breve" e nunca mostra sucesso', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await footer.getByLabel('E-mail para a newsletter').fill('alguem@exemplo.com');
  await footer.getByRole('button', { name: 'Enviar' }).click();

  await expect(footer.getByRole('status')).toHaveText(
    'A newsletter chega em breve — nenhum e-mail foi cadastrado.',
  );
  await expect(successToasts(page)).toHaveCount(0);
});

test('menu mobile abre como Sheet, prende o foco e Escape devolve o foco ao botão', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'o menu lateral só existe abaixo de 1280 px');
  await page.goto('/');

  const trigger = page.getByRole('button', { name: 'Abrir menu' });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Menu' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('button[aria-label="Abrir menu"]')).toHaveAttribute('aria-expanded', 'true');
  // Fundo fica fora da árvore de acessibilidade enquanto o Sheet está aberto.
  await expect(trigger).toHaveCount(0);

  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
