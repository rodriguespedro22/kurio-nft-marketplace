import type { Locator, Page } from '@playwright/test';

import { loginViaUi, submitLogin, USERS } from './support/auth';
import { expect, test } from './support/fixtures';
import { apiAsUser, bootScenario } from './support/mock';

const PRIMARY_ADDRESS = `0x${'1a'.repeat(20)}`;
const SECONDARY_ADDRESS = `0x${'b2'.repeat(20)}`;

type SlotName = 'Carteira principal' | 'Carteira secundária';
const slot = (page: Page, name: SlotName) => page.getByRole('region', { name });
const status = (region: Locator) => region.getByRole('status');

type WalletValues = {
  label: string;
  network: string;
  profileName: string;
  address: string;
  provider: string;
  referralCode: string;
  ens: string;
};

async function fillWallet(region: Locator, values: WalletValues) {
  await region.getByLabel('Apelido da carteira', { exact: true }).fill(values.label);
  await region.getByLabel('Rede', { exact: true }).selectOption({ label: values.network });
  await region.getByLabel('Nome do perfil', { exact: true }).fill(values.profileName);
  await region.getByLabel('Endereço da carteira', { exact: true }).fill(values.address);
  await region.getByLabel('Tipo de carteira', { exact: true }).selectOption({ label: values.provider });
  await region.getByLabel('Código de indicação', { exact: true }).fill(values.referralCode);
  await region.getByLabel('Nome ENS', { exact: true }).fill(values.ens);
}

const serverWallets = (page: Page) =>
  apiAsUser<{ slot: string; label: string; ensName: string }[]>(page, '/wallets');

const save = (region: Locator) => region.getByRole('button', { name: 'Salvar carteira' }).click();

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

test('carteiras: endereço inválido dá erro no campo; principal e secundária são salvas, editadas e o reload mantém', async ({
  page,
}) => {
  await loginViaUi(page, USERS.ana, '/carteiras');
  await expect(page).toHaveURL('/carteiras');
  await expect(page.getByRole('heading', { level: 1, name: 'Carteiras' })).toBeAttached();

  const primary = slot(page, 'Carteira principal');
  await expect(primary).toContainText('Você ainda não adicionou uma carteira principal.');
  await primary.getByRole('button', { name: 'Adicionar' }).click();

  // Nome de exibição e e-mail já vêm da conta.
  await expect(primary.getByLabel('Nome de exibição', { exact: true })).toHaveValue(USERS.ana.displayName);
  await expect(primary.getByLabel('E-mail', { exact: true })).toHaveValue(USERS.ana.email);

  await fillWallet(primary, {
    label: 'Principal',
    network: 'Ethereum',
    profileName: 'Coleção da Ana',
    address: '0x123',
    provider: 'MetaMask',
    referralCode: 'KURIO-2026',
    ens: 'ana',
  });
  await save(primary);
  const address = primary.getByLabel('Endereço da carteira', { exact: true });
  await expect(address).toHaveAttribute('aria-invalid', 'true');
  await expect(address).toHaveAccessibleDescription('Endereço inválido para a rede selecionada');
  await expect(address).toBeFocused();

  await address.fill(PRIMARY_ADDRESS);
  await save(primary);
  await expect(status(primary)).toHaveText(/Desconectada/);
  await expect(page.getByText('Carteira principal salva')).toBeVisible();

  const secondary = slot(page, 'Carteira secundária');
  await expect(secondary).toContainText('Você ainda não adicionou uma carteira secundária.');
  await secondary.getByRole('button', { name: 'Adicionar' }).click();
  await fillWallet(secondary, {
    label: 'Reserva',
    network: 'Polygon',
    profileName: 'Reserva da Ana',
    address: SECONDARY_ADDRESS,
    provider: 'Coinbase Wallet',
    referralCode: 'KURIO-2026',
    ens: 'reserva-ana',
  });
  await save(secondary);
  await expect(status(secondary)).toHaveText(/Desconectada/);

  await secondary.getByLabel('Apelido da carteira', { exact: true }).fill('Reserva fria');
  await save(secondary);
  // O toast da criação ainda pode estar na tela: a edição é confirmada pelo servidor.
  await expect
    .poll(async () => (await serverWallets(page)).find((w) => w.slot === 'secondary')?.label)
    .toBe('Reserva fria');

  await page.reload();
  await expect(secondary.getByLabel('Apelido da carteira', { exact: true })).toHaveValue('Reserva fria');
  await expect(secondary.getByLabel('Rede', { exact: true })).toHaveValue('polygon');
  await expect(primary.getByLabel('Endereço da carteira', { exact: true })).toHaveValue(PRIMARY_ADDRESS);
  await expect(primary.getByLabel('Nome ENS', { exact: true })).toHaveValue('ana');

  const server = await serverWallets(page);
  expect(server.map((w) => [w.slot, w.label, w.ensName])).toEqual([
    ['primary', 'Principal', 'ana.eth'],
    ['secondary', 'Reserva fria', 'reserva-ana.eth'],
  ]);
});

test('conexão: desconectar e conectar; WalletConnect recusa e mostra "Recusada" com explicação', async ({
  page,
}) => {
  await loginViaUi(page, USERS.colecionador, '/carteiras');
  const primary = slot(page, 'Carteira principal');
  await expect(status(primary)).toHaveText(/Conectada/);

  await primary.getByRole('button', { name: 'Desconectar' }).click();
  await expect(status(primary)).toHaveText(/Desconectada/);

  await primary.getByRole('button', { name: 'Conectar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Conectar MetaMask' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Conectar carteira' }).click();
  await expect(dialog).toBeHidden();
  await expect(status(primary)).toHaveText(/Conectada/);

  // Trocar o tipo de carteira desfaz a conexão; WalletConnect recusa na simulação.
  await primary.getByLabel('Tipo de carteira', { exact: true }).selectOption({ label: 'WalletConnect' });
  await save(primary);
  await expect(status(primary)).toHaveText(/Desconectada/);

  await primary.getByRole('button', { name: 'Conectar' }).click();
  await page
    .getByRole('dialog', { name: 'Conectar WalletConnect' })
    .getByRole('button', { name: 'Conectar carteira' })
    .click();
  await expect(status(primary)).toHaveText(/Recusada/);
  await expect(status(primary)).toContainText('A carteira recusou a conexão');
  await expect(primary.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
});

// ——— Perfil ———

/** PNG 1×1 transparente. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const NEW_PASSWORD = 'Nova@Senha26';

const profileForm = (page: Page) => page.getByRole('form', { name: 'Perfil do colecionador' });
const passwordForm = (page: Page) => page.getByRole('form', { name: 'Alterar senha' });
const avatarImage = (page: Page) => page.getByRole('img', { name: 'Seu avatar' });

test('perfil: nome de exibição salvo aparece no header e o reload mantém; nome de usuário de outro usuário dá erro no campo', async ({
  page,
}) => {
  await loginViaUi(page, USERS.colecionador, '/perfil');
  const form = profileForm(page);
  await expect(form.getByLabel('Nome de usuário', { exact: true })).toHaveValue('colecionador');
  await expect(form.getByLabel('Nome ENS', { exact: true })).toHaveValue('colecionador');

  await form.getByLabel('Nome de exibição', { exact: true }).fill('Colecionador Lendário');
  await form.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Perfil salvo')).toBeVisible();
  await expect(page.getByRole('banner')).toContainText('Colecionador Lendário');

  await page.reload();
  await expect(form.getByLabel('Nome de exibição', { exact: true })).toHaveValue('Colecionador Lendário');
  await expect(page.getByRole('banner')).toContainText('Colecionador Lendário');

  const username = form.getByLabel('Nome de usuário', { exact: true });
  await username.fill('ana');
  await form.getByRole('button', { name: 'Salvar' }).click();
  await expect(username).toHaveAttribute('aria-invalid', 'true');
  await expect(username).toHaveAccessibleDescription(/Nome de usuário já em uso/);
});

test('avatar: acima de 2 MB dá erro; imagem válida aparece, continua após o reload e pode ser removida', async ({
  page,
}) => {
  await loginViaUi(page, USERS.colecionador, '/perfil');
  const picker = page.getByLabel('Escolher imagem do avatar');

  await picker.setInputFiles({
    name: 'grande.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole('alert')).toContainText('A imagem deve ter até 2 MB.');
  await expect(avatarImage(page)).toHaveCount(0);

  await picker.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: TINY_PNG });
  await expect(avatarImage(page)).toHaveAttribute('src', /\/api\/avatars\/user-1\?v=/);
  await expect(page.getByText('Avatar atualizado')).toBeVisible();
  await expect.poll(() => avatarImage(page).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);

  await page.reload();
  await expect(avatarImage(page)).toHaveAttribute('src', /\/api\/avatars\/user-1\?v=/);

  await page.getByRole('button', { name: 'Remover' }).click();
  await expect(avatarImage(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Alterar', exact: true })).toBeVisible();
  await expect(avatarImage(page)).toHaveCount(0);
});

test('senha: atual errada dá erro no campo; troca válida desloga e só a nova senha entra', async ({
  page,
}) => {
  await loginViaUi(page, USERS.ana, '/perfil');
  const form = passwordForm(page);
  const current = form.getByLabel('Senha atual', { exact: true });

  await current.fill('Errada@2026');
  await form.getByLabel('Nova senha', { exact: true }).fill(NEW_PASSWORD);
  await form.getByLabel('Confirmar nova senha', { exact: true }).fill(NEW_PASSWORD);
  await form.getByRole('button', { name: 'Alterar senha' }).click();
  await expect(current).toHaveAttribute('aria-invalid', 'true');
  await expect(current).toHaveAccessibleDescription('Senha atual incorreta');

  await current.fill(USERS.ana.password);
  await form.getByRole('button', { name: 'Alterar senha' }).click();
  await expect(page).toHaveURL(/\/login\?.*motivo=senha/);
  await expect(page.getByText('Senha alterada. Entre com a nova senha.')).toBeVisible();
  await expect(
    page
      .getByRole('banner', { includeHidden: true })
      .getByRole('link', { name: 'Entrar', includeHidden: true }),
  ).toBeVisible();

  await submitLogin(page, USERS.ana);
  await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();

  await submitLogin(page, { email: USERS.ana.email, password: NEW_PASSWORD });
  await expect(page).toHaveURL('/perfil');
  await expect(page.getByRole('banner')).toContainText(USERS.ana.displayName);
});
