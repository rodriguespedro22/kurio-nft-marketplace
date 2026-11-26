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

/** No celular (< 768 px) o header sai: a sessão aparece no atalho de perfil da barra inferior. */
export function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 768;
}

/** Atalho de perfil da barra inferior (lido pelo DOM: no carrinho e no pagamento a barra fica oculta). */
const phoneProfile = (page: Page) => page.locator('nav[aria-label="Atalhos"] a[href="/perfil"]');

/** Onde a tela mostra o usuário logado: header (tablet/desktop) ou atalho de perfil (celular). */
export async function expectSignedIn(page: Page, displayName: string): Promise<void> {
  if (isPhone(page)) await expect(phoneProfile(page)).toHaveText(`Perfil de ${displayName}`);
  else await expect(page.getByRole('banner')).toContainText(displayName);
}

/** Sessão encerrada: link "Entrar" no header ou atalho "Perfil" sem nome no celular. */
export async function expectSignedOut(page: Page): Promise<void> {
  if (isPhone(page)) await expect(phoneProfile(page)).toHaveText('Perfil');
  else await expect(page.getByRole('banner').getByRole('link', { name: 'Entrar' })).toBeVisible();
}

/** Vai ao login pela navegação da página (sem recarregar). */
export async function openLoginFromNav(page: Page): Promise<void> {
  if (isPhone(page)) {
    await page
      .getByRole('navigation', { name: 'Atalhos' })
      .getByRole('link', { name: 'Perfil', exact: true })
      .click();
  } else {
    await page.getByRole('banner').getByRole('link', { name: 'Entrar' }).click();
  }
}

/** Login pela interface a partir de `/login`, esperando a tela mostrar o usuário. */
export async function loginViaUi(page: Page, user: SeedUser, redirect?: string): Promise<void> {
  await page.goto(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login');
  await submitLogin(page, user);
  await expectSignedIn(page, user.displayName);
}

/** Sai pelo menu da conta no header ou, no celular, pelo botão "Sair" do perfil. */
export async function logoutViaUi(page: Page): Promise<void> {
  if (isPhone(page)) {
    await page.goto('/perfil');
    await page.getByRole('button', { name: /^Sair/ }).first().click();
  } else {
    await page
      .getByRole('banner')
      .getByRole('button', { name: /^Conta de / })
      .click();
    await page.getByRole('menuitem', { name: 'Sair' }).click();
  }
  await expectSignedOut(page);
}
