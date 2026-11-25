import { http, HttpResponse } from 'msw';

import {
  ApplyCouponInputSchema,
  QuoteInputSchema,
  type Cart,
  type Network,
  type Quote,
  type QuoteIssue,
  type QuoteLine,
} from '@/contracts';
import { addEth, cmpEth, mulEth, pctEth, subEth } from '@/shared/money/eth';

import { nextId } from '../db/ids';
import type { CartRecord, MockDb, QuoteRecord } from '../db/schema';
import { db } from '../db/store';
import { COUPONS } from '../fixtures/coupons';
import { withNetwork } from '../network/with-network';
import { getScenario } from '../scenarios';
import { cartFor, findEdition, resolveOwner, toCart, touch, type Owner } from './cart';
import { apiError, apiPath, readJson, validationError } from './http';

/** Taxa de rede fixa por rede (ETH): ethereum | polygon | solana. */
export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.0004',
  solana: '0.0002',
};

/** Validade da cotação: depois disso o pedido exige uma nova (QUOTE_STALE). */
export const QUOTE_TTL_MS = 10 * 60 * 1000;
/** Cotações guardadas por carrinho (as mais recentes) — o banco mock vive no localStorage. */
const QUOTES_KEPT_PER_CART = 5;

type CouponCheck = { ok: true; percent: number } | { ok: false; code: 'COUPON_INVALID' | 'COUPON_EXPIRED' };

function checkCoupon(code: string): CouponCheck {
  const coupon = COUPONS[code];
  if (!coupon || getScenario().couponsDisabled) return { ok: false, code: 'COUPON_INVALID' };
  if (coupon.status === 'expired') return { ok: false, code: 'COUPON_EXPIRED' };
  return { ok: true, percent: coupon.percent };
}

/** Linhas, issues e totais a partir do carrinho e dos preços/estoques atuais (função pura). */
export function priceCart(d: MockDb, cart: CartRecord, network: Network) {
  const lines: QuoteLine[] = [];
  const issues: QuoteIssue[] = [];
  for (const item of cart.items) {
    const found = findEdition(d, item.nftId, item.editionId);
    if (!found) continue;
    const { price, available } = found.edition;
    lines.push({
      cartItemId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      quantity: item.quantity,
      unitPrice: price,
      lineTotal: mulEth(price, item.quantity),
    });
    if (available === 0) issues.push({ cartItemId: item.id, kind: 'sold_out' });
    else if (item.quantity > available) {
      issues.push({ cartItemId: item.id, kind: 'insufficient', requested: item.quantity, available });
    }
  }

  const subtotal = addEth(...lines.map((l) => l.lineTotal));
  const coupon = cart.couponCode ? checkCoupon(cart.couponCode) : null;
  const applied = coupon?.ok && cart.couponCode ? { code: cart.couponCode, percent: coupon.percent } : null;
  const discount = applied ? pctEth(subtotal, applied.percent) : '0';
  const networkFee = lines.length > 0 ? NETWORK_FEES[network] : '0';
  const total = addEth(subEth(subtotal, discount), networkFee);
  return {
    lines,
    issues,
    subtotal,
    discount,
    networkFee,
    total: cmpEth(total, '0') < 0 ? '0' : total,
    coupon: applied ? { code: applied.code, status: 'applied' as const, percent: applied.percent } : null,
  };
}

/** Guarda a cotação (snapshot de preços) e descarta as antigas do mesmo carrinho. Use em `db.update`. */
export function storeQuote(d: MockDb, cart: CartRecord, owner: Owner, network: Network): Quote {
  const previous = Object.values(d.quotes)
    .filter((q) => q.cartId === cart.id)
    .sort((a, b) => a.version - b.version);
  const now = Date.now();
  const quote: Quote = {
    quoteId: nextId(d, 'quote'),
    version: (previous.at(-1)?.version ?? 0) + 1,
    network,
    ...priceCart(d, cart, network),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
  };
  const record: QuoteRecord = {
    ...quote,
    cartId: cart.id,
    userId: owner.userId,
    createdAt: new Date(now).toISOString(),
  };
  d.quotes[quote.quoteId] = record;
  for (const old of previous.slice(0, Math.max(0, previous.length + 1 - QUOTES_KEPT_PER_CART))) {
    delete d.quotes[old.quoteId];
  }
  return quote;
}

export const quoteHandlers = [
  http.post(
    apiPath('/quotes'),
    withNetwork(async ({ request }) => {
      const owner = resolveOwner(request);
      if (owner instanceof Response) return owner;
      const parsed = QuoteInputSchema.safeParse(await readJson(request));
      if (!parsed.success) return validationError(parsed.error);

      let quote: Quote | undefined;
      db.update((d) => {
        quote = storeQuote(d, cartFor(d, owner), owner, parsed.data.network);
      });
      return HttpResponse.json(quote);
    }),
  ),

  /** Cupom fica no carrinho do servidor: `POST /quotes` lê daqui (reload mantém o cupom). */
  http.put(
    apiPath('/cart/coupon'),
    withNetwork(async ({ request }) => {
      const owner = resolveOwner(request);
      if (owner instanceof Response) return owner;
      const parsed = ApplyCouponInputSchema.safeParse(await readJson(request));
      if (!parsed.success) return validationError(parsed.error);

      const check = checkCoupon(parsed.data.code);
      if (!check.ok) {
        const message = check.code === 'COUPON_EXPIRED' ? 'Cupom expirado' : 'Cupom inválido';
        return apiError(422, check.code, `${message}.`, { fields: { code: message } });
      }
      let body: Cart | undefined;
      db.update((d) => {
        const cart = cartFor(d, owner);
        cart.couponCode = parsed.data.code;
        touch(cart);
        body = toCart(d, cart);
      });
      return HttpResponse.json(body);
    }),
  ),

  http.delete(
    apiPath('/cart/coupon'),
    withNetwork(({ request }) => {
      const owner = resolveOwner(request);
      if (owner instanceof Response) return owner;
      let body: Cart | undefined;
      db.update((d) => {
        const cart = cartFor(d, owner);
        cart.couponCode = null;
        touch(cart);
        body = toCart(d, cart);
      });
      return HttpResponse.json(body);
    }),
  ),
];
