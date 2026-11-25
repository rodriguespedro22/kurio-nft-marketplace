import type { Page } from '@playwright/test';

import { loginViaUi, logoutViaUi, submitLogin, USERS } from './support/auth';
import { addFromDetail } from './support/cart';
import { checkoutSummary } from './support/checkout';
import { expect, test } from './support/fixtures';
import { bootScenario, expireSession } from './support/mock';

const registerForm = (page: Page) => page.getByRole('form', { name: 'Criar conta' });
/** O perfil mostra os dados da conta no formulário. */
const displayNameField = (page: Page) => page.getByLabel('Nome de exibição', { exact: true });

async function fillRegister(
  page: Page,
  data: { username: string; email: string; password: string; confirmPassword?: string },
) {
  const form = registerForm(page);
  await form.getByLabel('Nome de usuário').fill(data.username);
  await form.getByLabel('E-mail').fill(data.email);
  await form.getByLabel('Senha', { exact: true }).fill(data.password);
  await form.getByLabel('Confirmar senha').fill(data.confirmPassword ?? data.password);
  await form.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click();
}

/** Mensagem ligada ao campo por aria-describedby (não basta estar perto visualmente). */
async function describedText(page: Page, label: string): Promise<string> {
  const field = registerForm(page).getByLabel(label, { exact: true });
  const ids = (await field.getAttribute('aria-describedby')) ?? '';
  const texts = await Promise.all(
    ids
      .split(' ')
      .filter(Boolean)
      .map((id) => page.locator(`[id="${id}"]`).innerText()),
  );
  return texts.join(' ');
}

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

test('cadastro vazio mostra erros por campo, associados e com foco no primeiro inválido', async ({
  page,
}) => {
  await page.goto('/cadastro');
  await registerForm(page)
    .getByRole('button', { name: /^Criar (conta|perfil)$/ })
    .click();

  for (const label of ['Nome de usuário', 'E-mail', 'Senha', 'Confirmar senha']) {
    await expect(registerForm(page).getByLabel(label, { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(await describedText(page, label)).toContain('Obrigatório');
  }
  await expect(registerForm(page).getByLabel('Nome de usuário')).toBeFocused();
});

test('cadastro com e-mail existente mostra "E-mail já cadastrado" no campo', async ({ page }) => {
  await page.goto('/cadastro');
  await fillRegister(page, {
    username: `novo_${unique()}`,
    email: USERS.colecionador.email,
    password: 'Senha@123',
  });

  await expect(registerForm(page).getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true');
  await expect.poll(() => describedText(page, 'E-mail')).toContain('E-mail já cadastrado');
  await expect(page).toHaveURL(/\/cadastro/);
});

test('senhas diferentes e senha fraca são apontadas nos campos certos', async ({ page }) => {
  await page.goto('/cadastro');
  await fillRegister(page, {
    username: `fraca_${unique()}`,
    email: `fraca_${unique()}@exemplo.com`,
    password: 'senhafraca',
    confirmPassword: 'outra',
  });
  expect(await describedText(page, 'Senha')).toMatch(/maiúscula|número|símbolo/);
  await expect(registerForm(page).getByLabel('Senha', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});

test('cenário register-conflict: nome de usuário em uso aparece no campo', async ({ page }) => {
  await bootScenario(page, 'register-conflict');
  await page.goto('/cadastro');
  const id = unique();
  await fillRegister(page, {
    username: `livre_${id}`,
    email: `livre_${id}@exemplo.com`,
    password: 'Senha@123',
  });

  await expect(registerForm(page).getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true');
  await expect.poll(() => describedText(page, 'Nome de usuário')).toContain('Nome de usuário já em uso');
});

test('cadastro válido loga, reload mantém a sessão e logout volta a "Entrar"', async ({ page }) => {
  const id = unique();
  const username = `colec_${id}`;
  await page.goto('/cadastro');
  await fillRegister(page, { username, email: `${username}@exemplo.com`, password: 'Senha@123' });

  await expect(page).toHaveURL('/');
  const header = page.getByRole('banner');
  await expect(header).toContainText(username);

  await page.reload();
  await expect(header).toContainText(username);

  await logoutViaUi(page);
  await page.reload();
  await expect(header.getByRole('link', { name: 'Entrar' })).toBeVisible();
});

test('login com senha errada mostra erro genérico sem revelar qual campo falhou', async ({ page }) => {
  await page.goto('/login');
  await submitLogin(page, { email: USERS.colecionador.email, password: 'Errada@123' });
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos');
  await expect(page).toHaveURL(/\/login/);
});

test('/perfil deslogado vai a /login?redirect=%2Fperfil e volta após o login', async ({ page }) => {
  await page.goto('/perfil');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil$/);

  await submitLogin(page, USERS.colecionador);
  await expect(page).toHaveURL('/perfil');
  await expect(page.getByRole('heading', { level: 1, name: 'Meu perfil' })).toBeAttached();
  await expect(displayNameField(page)).toHaveValue(USERS.colecionador.displayName);
});

test('sessão expirada no servidor: aviso "Sua sessão expirou" e retomada do ponto após login', async ({
  page,
}) => {
  await loginViaUi(page, USERS.colecionador, '/perfil');
  await expect(page).toHaveURL('/perfil');
  // O login dispara o merge e o refetch do carrinho. Um request desses que voltar 401 depois de
  // expirar já desloga esta página (motivo em memória) e o goto abaixo o perderia.
  await page.waitForLoadState('networkidle');

  await expireSession(page);
  await page.goto('/perfil');

  await expect(page).toHaveURL(/\/login\?.*redirect=%2Fperfil/);
  await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar.')).toBeVisible();
  // No desktop o login é um modal: o header fica atrás (fora da árvore de acessibilidade).
  await expect(
    page
      .getByRole('banner', { includeHidden: true })
      .getByRole('link', { name: 'Entrar', includeHidden: true }),
  ).toBeVisible();

  await submitLogin(page, USERS.colecionador);
  await expect(page).toHaveURL('/perfil');
});

test('sessão expira no meio do checkout: login volta ao checkout com o formulário e o carrinho', async ({
  page,
}) => {
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, '/nft/nft-ivory-baron-088', /1\/10/);
  await page.goto('/checkout');
  const form = page.getByRole('form', { name: 'Perfil do colecionador' });
  await form.getByLabel('Rede').selectOption('polygon');
  await form.getByLabel('Observação do colecionador (opcional)').fill('Guardar na coleção principal');
  await page.waitForLoadState('networkidle');

  await expireSession(page);
  await checkoutSummary(page).getByRole('button', { name: 'Confirmar compra', exact: true }).click();

  await expect(page).toHaveURL(/\/login\?.*redirect=%2Fcheckout/);
  await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar.')).toBeVisible();
  await submitLogin(page, USERS.colecionador);

  await expect(page).toHaveURL('/checkout');
  await expect(form.getByLabel('Rede')).toHaveValue('polygon');
  await expect(form.getByLabel('Observação do colecionador (opcional)')).toHaveValue(
    'Guardar na coleção principal',
  );
  await expect(checkoutSummary(page).getByRole('listitem')).toHaveCount(1);
  await expect(checkoutSummary(page)).toContainText('Ivory Baron #088');
});

test('login A → logout → login B mostra só os dados de B', async ({ page }) => {
  await loginViaUi(page, USERS.colecionador, '/perfil');
  await expect(displayNameField(page)).toHaveValue(USERS.colecionador.displayName);

  await logoutViaUi(page);
  await loginViaUi(page, USERS.ana, '/perfil');

  await expect(page).toHaveURL('/perfil');
  await expect(displayNameField(page)).toHaveValue(USERS.ana.displayName);
  await expect(page.getByRole('main')).not.toContainText(USERS.colecionador.displayName);
  await expect(page.getByRole('banner')).not.toContainText(USERS.colecionador.displayName);
});

test('logado, /login redireciona para o destino em vez de mostrar o formulário', async ({ page }) => {
  await loginViaUi(page, USERS.ana);
  await page.goto('/login?redirect=%2Fperfil');
  await expect(page).toHaveURL('/perfil');
});
