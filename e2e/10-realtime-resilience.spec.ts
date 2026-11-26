import type { Page } from '@playwright/test';

import {
  expectSignedIn,
  openLoginFromNav,
  submitLogin,
  USERS,
  loginViaUi,
  logoutViaUi,
} from './support/auth';
import { addFromDetail, cartList, cartShortcut } from './support/cart';
import { orderStatus, placeOrder } from './support/checkout';
import { expect, test } from './support/fixtures';
import {
  bootScenario,
  dropSocket,
  emitNftUpdate,
  emitStaleNftEvent,
  mockControl,
  replayLastEvent,
  waitForRealtime,
} from './support/mock';

const IVORY_ID = 'nft-ivory-baron-088';
const IVORY = `/nft/${IVORY_ID}`;
const IVORY_1_10 = `${IVORY_ID}-1-10`;
const GOLDEN_ID = 'nft-golden-beat-207';
const GOLDEN = `/nft/${GOLDEN_ID}`;
const GOLDEN_1_50 = `${GOLDEN_ID}-1-50`;

const changeNotice = (page: Page) => page.getByRole('alert', { name: 'Seu carrinho mudou' });
const ivoryLine = (page: Page) =>
  cartList(page).getByRole('listitem').filter({ hasText: 'Ivory Baron #088' });

/** Carrinho carregado e socket conectado: só então um evento pode gerar aviso. */
async function openCart(page: Page, lines: number, opts: { authenticated?: boolean } = {}) {
  await page.goto('/carrinho');
  await expect(cartList(page).getByRole('listitem')).toHaveCount(lines);
  await waitForRealtime(page, opts);
}

test.beforeEach(async ({ page }) => {
  await bootScenario(page, 'default');
});

// ——— Parte 1: nft.updated ———

test('evento repetido (mesmo eventId) gera um único aviso', async ({ page }) => {
  await addFromDetail(page, IVORY, /1\/10/);
  await addFromDetail(page, GOLDEN, /1\/50/);
  await openCart(page, 2);

  const first = await emitNftUpdate(page, IVORY_ID, { editionId: IVORY_1_10, price: '3.10' });
  const replay = await replayLastEvent(page);
  expect(replay.event?.eventId).toBe(first.event?.eventId);
  expect(replay.delivered).toBe(1);

  // Evento novo de outro item = marcador: chegou depois da reentrega, na mesma conexão.
  await emitNftUpdate(page, GOLDEN_ID, { editionId: GOLDEN_1_50, price: '2.00' });
  await expect(changeNotice(page)).toContainText('Golden Beat #207');
  const items = changeNotice(page).getByRole('listitem');
  await expect(items).toHaveCount(2);
  await expect(items.filter({ hasText: 'Ivory Baron #088' })).toHaveCount(1);
});

test('evento com versão antiga não faz o preço regredir (gate e cache)', async ({ page }) => {
  await addFromDetail(page, IVORY, /1\/10/);
  await addFromDetail(page, GOLDEN, /1\/50/);
  await openCart(page, 2);

  await emitNftUpdate(page, IVORY_ID, { editionId: IVORY_1_10, price: '3.10' });
  await expect(ivoryLine(page)).toContainText('3.10 ETH');

  // Mesma conexão: o gate barra a versão antiga. O evento do Golden é o marcador de ordem.
  await emitStaleNftEvent(page, IVORY_ID);
  await emitNftUpdate(page, GOLDEN_ID, { editionId: GOLDEN_1_50, price: '2.00' });
  await expect(changeNotice(page)).toContainText('Golden Beat #207');
  await expect(ivoryLine(page)).toContainText('3.10 ETH');
  await expect(changeNotice(page)).not.toContainText('0.01');

  // Conexão nova (gate vazio): quem barra é a versão do que veio do REST.
  await page.reload();
  await expect(ivoryLine(page)).toContainText('3.10 ETH');
  await expect(cartList(page).getByRole('listitem')).toHaveCount(2);
  await waitForRealtime(page);
  await emitStaleNftEvent(page, IVORY_ID);
  await emitNftUpdate(page, GOLDEN_ID, { editionId: GOLDEN_1_50, price: '2.10' });
  await expect(changeNotice(page)).toContainText('Golden Beat #207');
  await expect(ivoryLine(page)).toContainText('3.10 ETH');
  await expect(changeNotice(page)).not.toContainText('Ivory');

  await page.goto(IVORY);
  await page.getByRole('radiogroup', { name: 'Edição' }).getByRole('radio', { name: /1\/10/ }).click();
  await expect(page.getByTestId('nft-price')).toHaveText('3.10 ETH');
  await waitForRealtime(page);
  await emitStaleNftEvent(page, IVORY_ID);
  await page.waitForTimeout(300);
  await expect(page.getByTestId('nft-price')).toHaveText('3.10 ETH');
});

test('troca de usuário: carrinho e avisos de A não aparecem para B', async ({ page, isMobile }) => {
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  await openCart(page, 1, { authenticated: true });
  await emitNftUpdate(page, IVORY_ID, { editionId: IVORY_1_10, price: '3.10' });
  await expect(changeNotice(page)).toContainText('Ivory Baron #088');

  // Sem recarregar a página: o que ficou em memória não pode vazar.
  await logoutViaUi(page);
  await openLoginFromNav(page);
  await submitLogin(page, USERS.ana);
  await expectSignedIn(page, USERS.ana.displayName);
  await cartShortcut(page, isMobile).click();
  await expect(page).toHaveURL('/carrinho');
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible();
  await expect(changeNotice(page)).toHaveCount(0);

  await waitForRealtime(page, { authenticated: true });
  await emitNftUpdate(page, IVORY_ID, { editionId: IVORY_1_10, price: '3.20' });
  await page.waitForTimeout(300);
  await expect(changeNotice(page)).toHaveCount(0);
});

test('socket cai e o preço muda nesse intervalo: ao reconectar, o REST traz o valor novo', async ({
  page,
}) => {
  await page.goto(IVORY);
  await expect(page.getByTestId('nft-price')).toHaveText('1.79 ETH');
  await waitForRealtime(page);

  await dropSocket(page, { holdMs: 1500 });
  const missed = await emitNftUpdate(page, IVORY_ID, { price: '4.20' });
  expect(missed.delivered).toBe(0);
  await expect(page.getByTestId('nft-price')).toHaveText('4.20 ETH', { timeout: 10_000 });
});

// ——— Parte 2: order.updated ———

test('pedido pendente com o socket fora: ao reconectar, a tela reconcilia pelo REST', async ({ page }) => {
  await page.clock.install();
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  await placeOrder(page);
  await expect(orderStatus(page)).toHaveText('Pendente');
  await waitForRealtime(page, { authenticated: true });

  await dropSocket(page, { holdMs: 1500 });
  await page.clock.runFor(4000);
  await expect(orderStatus(page)).toHaveText('Confirmado', { timeout: 15_000 });
});

test('order.updated repetido ou antigo depois de "Confirmado" não volta para "Pendente"', async ({
  page,
}) => {
  await page.clock.install();
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  const orderId = await placeOrder(page);
  await waitForRealtime(page, { authenticated: true });
  await page.clock.runFor(4000);
  await expect(orderStatus(page)).toHaveText('Confirmado');

  await mockControl(page, '/__mock/socket/emit-stale-order', { orderId });
  await replayLastEvent(page);
  await page.waitForTimeout(300);
  await expect(orderStatus(page)).toHaveText('Confirmado');
});

test('pedido de A resolvido depois que B entrou: B não recebe aviso nem vê o pedido', async ({ page }) => {
  await page.clock.install();
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  const orderId = await placeOrder(page);
  await expect(orderStatus(page)).toHaveText('Pendente');

  await logoutViaUi(page);
  await loginViaUi(page, USERS.ana);
  await waitForRealtime(page, { authenticated: true });
  await page.clock.runFor(4000);
  await page.waitForTimeout(300);
  await expect(page.getByText(/Pedido confirmado|Pagamento recusado/)).toHaveCount(0);

  // Acesso direto ao pedido de A: a API nega (403) e a tela não mostra status nem recibo.
  await page.goto(`/pedido/${orderId}`);
  await expect(page.getByRole('heading', { name: 'Este pedido é de outra conta' })).toBeVisible();
  await expect(orderStatus(page)).toHaveCount(0);
});
