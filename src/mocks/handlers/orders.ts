import { delay, http, HttpResponse } from 'msw';

import {
  CreateOrderInputSchema,
  type CreateOrderInput,
  type Order,
  type OrderLineSnapshot,
  type Quote,
  type Transaction,
} from '@/contracts';
import { addEth, cmpEth } from '@/shared/money/eth';
import { toListItem } from '@/shared/nft/list-item';

import { nextId } from '../db/ids';
import type { MockDb, OrderRecord, QuoteRecord } from '../db/schema';
import { db } from '../db/store';
import { withNetwork } from '../network/with-network';
import { getScenario } from '../scenarios';
import { emitNftUpdated, emitOrderUpdated } from '../socket/server';
import { cartFor, findEdition, touch, type Owner } from './cart';
import { apiError, apiPath, readJson, validationError } from './http';
import { priceCart, storeQuote } from './quotes';
import { authenticate } from './session';

/** Explorador simulado dentro do próprio app (rota `/explorador/tx/:hash`). */
const EXPLORER = '/explorador/tx/';

// ——— Hash e serialização estável ———

/** JSON com chaves ordenadas: o mesmo corpo sempre dá o mesmo hash. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ——— Projeção e agenda de resolução ———

function toOrder(record: OrderRecord): Order {
  const { id, status, createdAt, updatedAt, version, txHash, explorerUrl, rejectionReason, snapshot } =
    record;
  return { id, status, createdAt, updatedAt, version, txHash, explorerUrl, rejectionReason, snapshot };
}

/** Bloco determinístico a partir do hash: a mesma transação sempre cai no mesmo bloco. */
const blockFor = (txHash: string) => 19_000_000 + (parseInt(txHash.slice(2, 10), 16) % 1_000_000);

function toTransaction(record: OrderRecord & { txHash: string }): Transaction {
  const { snapshot } = record;
  return {
    hash: record.txHash,
    status: 'confirmed',
    network: snapshot.network,
    blockNumber: blockFor(record.txHash),
    timestamp: record.updatedAt,
    tokens: snapshot.lines.reduce((sum, line) => sum + line.quantity, 0),
    value: snapshot.total,
    networkFee: snapshot.networkFee,
  };
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Agenda a resolução para `resolveAt` (já vencido → agora). */
function schedule(order: OrderRecord): void {
  if (timers.has(order.id)) return;
  const wait = Math.max(0, Date.parse(order.resolveAt) - Date.now());
  timers.set(
    order.id,
    setTimeout(() => {
      timers.delete(order.id);
      void resolveOrder(order.id);
    }, wait),
  );
}

/** No boot do mock: pedidos pendentes guardados voltam à agenda (o pedido sobrevive ao refresh). */
export function scheduleOpenOrders(): void {
  for (const order of Object.values(db.get().orders)) {
    if (order.status === 'pending') schedule(order);
  }
}

/** Testes e reset de cenário: nenhuma resolução pendente dispara depois. */
export function clearOrderTimers(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
}

/**
 * Resolve um pedido pendente conforme o cenário. Confirmado: baixa o estoque, tira do carrinho só
 * as quantidades compradas, grava txHash determinístico e emite `order.updated` + `nft.updated`.
 * Recusado: só o status e o motivo mudam.
 */
export async function resolveOrder(orderId: string): Promise<void> {
  const pending = db.get().orders[orderId];
  if (!pending || pending.status !== 'pending') return;
  const scenario = getScenario();
  const txHash = scenario.orderOutcome === 'confirmed' ? `0x${await sha256Hex(orderId)}` : null;

  const touched = new Set<string>();
  db.update((d) => {
    const order = d.orders[orderId];
    if (!order || order.status !== 'pending') return;
    order.updatedAt = new Date().toISOString();
    if (!txHash) {
      order.status = 'rejected';
      order.rejectionReason = scenario.rejectionReason ?? 'Pagamento recusado.';
      return;
    }
    order.status = 'confirmed';
    order.txHash = txHash;
    order.explorerUrl = `${EXPLORER}${txHash}`;

    const cart = cartFor(d, { key: `user:${order.userId}`, userId: order.userId });
    for (const line of order.snapshot.lines) {
      const found = findEdition(d, line.nftId, line.editionId);
      if (found) {
        found.edition.available = Math.max(0, found.edition.available - line.quantity);
        touched.add(line.nftId);
      }
      const item = cart.items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId);
      if (item) item.quantity -= line.quantity;
    }
    cart.items = cart.items.filter((item) => item.quantity > 0);
    touch(cart);
  });

  emitOrderUpdated(orderId);
  for (const nftId of touched) emitNftUpdated(nftId);
}

// ——— Validação da cotação ———

const sameLines = (a: Quote['lines'], b: Quote['lines']) =>
  a.length === b.length &&
  a.every((line) => {
    const other = b.find((l) => l.cartItemId === line.cartItemId);
    return (
      other !== undefined &&
      other.editionId === line.editionId &&
      other.quantity === line.quantity &&
      cmpEth(other.unitPrice, line.unitPrice) === 0
    );
  });

/** A cotação ainda vale contra o estado atual (preço, estoque, cupom, taxa, validade)? */
function isQuoteCurrent(d: MockDb, quote: QuoteRecord | undefined, owner: Owner, input: CreateOrderInput) {
  if (!quote || quote.userId !== owner.userId || quote.version !== input.quoteVersion) return false;
  if (quote.network !== input.network || Date.parse(quote.expiresAt) <= Date.now()) return false;
  const now = priceCart(d, cartFor(d, owner), quote.network);
  return (
    now.issues.length === 0 &&
    sameLines(quote.lines, now.lines) &&
    cmpEth(quote.discount, now.discount) === 0 &&
    cmpEth(quote.networkFee, now.networkFee) === 0 &&
    cmpEth(quote.total, now.total) === 0 &&
    (quote.coupon?.code ?? null) === (now.coupon?.code ?? null)
  );
}

/** Alta aplicada pelo cenário price-change-during-checkout. */
const CHECKOUT_PRICE_BUMP = '0.25';

/**
 * Cenários `*-during-checkout`: no 1º envio de pedido, o 1º item do carrinho sobe de preço ou
 * esgota sem evento no socket — a cotação da revisão fica velha e o pedido volta QUOTE_STALE.
 */
function applyCheckoutSurprise(d: MockDb, owner: Owner): void {
  const surprise = getScenario().onFirstCheckoutQuote;
  if (!surprise || d.meta.firstCheckoutQuoteHandled) return;
  const item = cartFor(d, owner).items[0];
  const found = item ? findEdition(d, item.nftId, item.editionId) : null;
  if (!found) return;
  d.meta.firstCheckoutQuoteHandled = true;
  if (surprise === 'sold_out') found.edition.available = 0;
  else found.edition.price = addEth(found.edition.price, CHECKOUT_PRICE_BUMP);
}

function snapshotLines(d: MockDb, quote: Quote): OrderLineSnapshot[] {
  return quote.lines.flatMap((line) => {
    const found = findEdition(d, line.nftId, line.editionId);
    if (!found) return [];
    return [
      {
        ...line,
        name: found.nft.name,
        tokenNumber: found.nft.tokenNumber,
        editionLabel: found.edition.label,
        image: toListItem(found.nft).image,
      },
    ];
  });
}

const replayed = (order: OrderRecord) =>
  HttpResponse.json(toOrder(order), { status: 200, headers: { 'Idempotent-Replayed': 'true' } });

export const orderHandlers = [
  /**
   * `POST /orders` com `Idempotency-Key`: a mesma chave com o mesmo corpo devolve o mesmo pedido
   * (200 + `Idempotent-Replayed`); com outro corpo, 409. A cotação é revalidada antes de criar.
   */
  http.post(
    apiPath('/orders'),
    withNetwork(
      async ({ request }) => {
        const auth = authenticate(request);
        if (auth instanceof Response) return auth;
        const key = request.headers.get('idempotency-key')?.trim();
        if (!key) return apiError(400, 'BAD_REQUEST', 'Envie o header Idempotency-Key.');

        const body = await readJson(request);
        const bodyHash = await sha256Hex(stableStringify(body));
        const used = db.get().idempotency[key];
        if (used) {
          const order = db.get().orders[used.orderId];
          if (used.userId === auth.user.id && used.bodyHash === bodyHash && order) return replayed(order);
          return apiError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'Esta tentativa de compra já foi usada com outros dados.',
          );
        }

        const parsed = CreateOrderInputSchema.safeParse(body);
        if (!parsed.success) return validationError(parsed.error);
        const input = parsed.data;
        const owner: Owner = { key: `user:${auth.user.id}`, userId: auth.user.id };

        const wallet = db.get().wallets.find((w) => w.id === input.walletId && w.userId === auth.user.id);
        if (!wallet) {
          return apiError(422, 'VALIDATION_ERROR', 'Carteira não encontrada.', {
            fields: { walletId: 'Escolha uma carteira cadastrada' },
          });
        }
        if (wallet.connection !== 'connected') {
          return apiError(409, 'CONFLICT', 'Conecte a carteira antes de comprar.');
        }

        let stale: Quote | null = null;
        let created: OrderRecord | null = null;
        db.update((d) => {
          applyCheckoutSurprise(d, owner);
          const quote = d.quotes[input.quoteId];
          if (!quote || !isQuoteCurrent(d, quote, owner, input)) {
            stale = storeQuote(d, cartFor(d, owner), owner, input.network);
            return;
          }
          const now = new Date();
          const order: OrderRecord = {
            id: nextId(d, 'order'),
            status: 'pending',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            version: 1,
            txHash: null,
            explorerUrl: null,
            rejectionReason: null,
            snapshot: {
              lines: snapshotLines(d, quote),
              subtotal: quote.subtotal,
              discount: quote.discount,
              networkFee: quote.networkFee,
              total: quote.total,
              network: quote.network,
              walletId: wallet.id,
              walletProvider: wallet.provider,
              walletAddress: wallet.address,
              coupon: quote.coupon,
            },
            userId: auth.user.id,
            quoteId: quote.quoteId,
            idempotencyKey: key,
            buyer: input.buyer,
            resolveAt: new Date(now.getTime() + getScenario().orderResolveMs).toISOString(),
          };
          d.orders[order.id] = order;
          d.idempotency[key] = {
            key,
            userId: auth.user.id,
            bodyHash,
            orderId: order.id,
            createdAt: order.createdAt,
          };
          created = order;
        });

        if (stale) {
          return apiError(
            409,
            'QUOTE_STALE',
            'Os valores mudaram desde a cotação. Revise antes de confirmar.',
            {
              details: { quote: stale },
            },
          );
        }
        const order = created as OrderRecord | null;
        if (!order) return apiError(500, 'TRANSIENT', 'Não foi possível criar o pedido.');
        schedule(order);

        // Cenário order-timeout-idempotent: o pedido já existe, mas a 1ª resposta demora.
        const slow = getScenario().orderCreateDelayMs;
        if (slow) await delay(slow);
        return HttpResponse.json(toOrder(db.get().orders[order.id] ?? order), { status: 201 });
      },
      { route: 'orders' },
    ),
  ),

  http.get(
    apiPath('/orders'),
    withNetwork(({ request }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const orders = Object.values(db.get().orders)
        .filter((order) => order.userId === auth.user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(toOrder);
      return HttpResponse.json(orders);
    }),
  ),

  /** Só o dono vê o pedido; de outro usuário é 404 (não revela que existe). */
  http.get<{ id: string }>(
    apiPath('/orders/:id'),
    withNetwork(({ request, params }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const order = db.get().orders[params.id];
      if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.');
      if (order.userId !== auth.user.id)
        return apiError(403, 'FORBIDDEN', 'Este pedido pertence a outra conta.');
      return HttpResponse.json(toOrder(order));
    }),
  ),

  /** Explorador simulado: público, só pedidos confirmados (recusados não chegam à rede). */
  http.get<{ hash: string }>(
    apiPath('/explorer/tx/:hash'),
    withNetwork(({ params }) => {
      const order = Object.values(db.get().orders).find(
        (o): o is OrderRecord & { txHash: string } => o.status === 'confirmed' && o.txHash === params.hash,
      );
      if (!order) return apiError(404, 'NOT_FOUND', 'Transação não encontrada.');
      return HttpResponse.json(toTransaction(order));
    }),
  ),
];
