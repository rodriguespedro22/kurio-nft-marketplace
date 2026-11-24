import { expect, type Page } from '@playwright/test';

/** Usuários das fixtures (src/mocks/fixtures/users.ts) — senha de demonstração `Kurio@2026`. */
export const USERS = {
  colecionador: {
    email: 'colecionador@kurio.test',
    password: 'Kurio@2026',
    displayName: 'Colecionador Kurio',
  },
  ana: { email: 'ana@kurio.test', password: 'Kurio@2026', displayName: 'Ana Ribeiro' },
} as const;

export type SeedUser = (typeof USERS)[keyof typeof USERS];

/** Preenche e envia o formulário de login da página atual (`/login`). */
export async function submitLogin(page: Page, user: { email: string; password: string }): Promise<void> {
  const form = page.getByRole('form', { name: 'Entrar' });
  await form.getByLabel('E-mail').fill(user.email);
  await form.getByLabel('Senha', { exact: true }).fill(user.password);
  await form.getByRole('button', { name: 'Entrar', exact: true }).click();
}

/** Login pela interface a partir de `/login`, esperando o header mostrar o usuário. */
export async function loginViaUi(page: Page, user: SeedUser, redirect?: string): Promise<void> {
  await page.goto(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login');
  await submitLogin(page, user);
  await expect(page.getByRole('banner')).toContainText(user.displayName);
}

/** Abre o menu da conta no header e clica em "Sair". */
export async function logoutViaUi(page: Page): Promise<void> {
  await page
    .getByRole('banner')
    .getByRole('button', { name: /^Conta de / })
    .click();
  await page.getByRole('menuitem', { name: 'Sair' }).click();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Entrar' })).toBeVisible();
}
