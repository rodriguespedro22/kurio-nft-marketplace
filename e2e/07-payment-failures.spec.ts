import { loginViaUi, USERS } from './support/auth';
import { addFromDetail } from './support/cart';
import { mockOrders, openReview, orderStatus, placeOrder, reviewDialog } from './support/checkout';
import { expect, test } from './support/fixtures';
import { bootScenario, serverCart } from './support/mock';

const IVORY = '/nft/nft-ivory-baron-088';
const IVORY_1_10 = 'nft-ivory-baron-088-1-10';

test('payment-declined: "Pagamento recusado" com o motivo, carrinho intacto e sem recibo', async ({
  page,
}) => {
  await page.clock.install();
  await bootScenario(page, 'payment-declined');
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);

  await placeOrder(page);
  await expect(orderStatus(page)).toHaveText('Pendente');
  await page.clock.runFor(4000);

  await expect(orderStatus(page)).toHaveText('Pagamento recusado');
  await expect(page.getByRole('main')).toContainText(
    'Pagamento recusado pela carteira. Nenhum valor foi debitado.',
  );
  await expect(page.getByRole('region', { name: 'Seus NFTs agora estão na sua carteira' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Voltar ao carrinho' })).toBeVisible();
  expect(await serverCart(page)).toEqual([{ editionId: IVORY_1_10, quantity: 1 }]);
});

test('duplo clique em "Confirmar compra" cria um pedido só', async ({ page }) => {
  await bootScenario(page, 'default');
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  await openReview(page);

  await reviewDialog(page).getByRole('button', { name: 'Confirmar compra' }).dblclick();
  await expect(page).toHaveURL(/\/pedido\/order-/);
  expect(await mockOrders(page)).toHaveLength(1);
});

test('order-timeout-idempotent: "Verificando seu pedido…" e o mesmo pedido é confirmado', async ({
  page,
}) => {
  await page.clock.install();
  await bootScenario(page, 'order-timeout-idempotent');
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  await openReview(page);

  await reviewDialog(page).getByRole('button', { name: 'Confirmar compra' }).click();
  await page.clock.runFor(8500);
  await expect(page.getByText('Verificando seu pedido…')).toBeVisible();
  await page.clock.runFor(2000); // pausa antes do reenvio com a mesma chave

  await expect(page).toHaveURL(/\/pedido\/order-/, { timeout: 30_000 });
  const orderId = new URL(page.url()).pathname.split('/').pop();
  await page.clock.runFor(4000);
  await expect(orderStatus(page)).toHaveText('Confirmado');
  const orders = await mockOrders(page);
  expect(orders.map((o) => o.id)).toEqual([orderId]);
});

test('reload com o pedido pendente volta ao mesmo pedido', async ({ page }) => {
  await page.clock.install();
  await bootScenario(page, 'default');
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  const orderId = await placeOrder(page);
  await expect(orderStatus(page)).toHaveText('Pendente');

  await page.reload();
  await expect(page).toHaveURL(`/pedido/${orderId}`);
  await expect(orderStatus(page)).toHaveText('Pendente');
  // O checkout leva de volta ao pedido em andamento.
  await page.goto('/checkout');
  await expect(page).toHaveURL(`/pedido/${orderId}`);

  // Cada carregamento reinstala o relógio falso a partir do início do teste: avança com folga.
  await page.clock.runFor(20_000);
  await expect(orderStatus(page)).toHaveText('Confirmado');
  expect(await mockOrders(page)).toHaveLength(1);
});

test('reload durante o timeout do pedido: o checkout retoma o mesmo pedido, sem duplicar', async ({
  page,
}) => {
  await page.clock.install();
  await bootScenario(page, 'order-timeout-idempotent');
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  await openReview(page);

  await reviewDialog(page).getByRole('button', { name: 'Confirmar compra' }).click();
  // O servidor já criou o pedido e segura a resposta: recarrega antes de ela chegar.
  await expect.poll(async () => (await mockOrders(page)).length).toBe(1);
  await page.reload();

  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/pedido\/order-/, { timeout: 30_000 });
  const orders = await mockOrders(page);
  expect(orders.map((o) => o.id)).toEqual([new URL(page.url()).pathname.split('/').pop()]);
});

test('pedido lembrado que não existe mais (404) é esquecido e não trava o checkout', async ({ page }) => {
  await bootScenario(page, 'default');
  await loginViaUi(page, USERS.colecionador);
  await addFromDetail(page, IVORY, /1\/10/);
  // Ex.: "Resetar dados" com um pedido pendente — o id lembrado no navegador some do servidor.
  await page.evaluate(() => localStorage.setItem('kurio:pending-order:user-1', 'order-9999'));

  await page.goto('/checkout');
  await expect(page).toHaveURL('/pedido/order-9999');
  await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible();

  await page.goto('/checkout');
  await expect(page.getByRole('form', { name: 'Perfil do colecionador' })).toBeVisible();
  await expect(page).toHaveURL('/checkout');
});
