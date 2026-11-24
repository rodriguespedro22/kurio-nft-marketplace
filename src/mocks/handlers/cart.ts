import { http, HttpResponse } from 'msw';

import {
  AddCartItemInputSchema,
  MergeCartInputSchema,
  UpdateCartItemInputSchema,
  type Cart,
  type CartAdjustment,
  type CartItem,
  type MergeCartResponse,
} from '@/contracts';
import { toListItem } from '@/shared/nft/list-item';

import { nextId } from '../db/ids';
import type { CartItemRecord, CartRecord, MockDb } from '../db/schema';
import { db } from '../db/store';
import { withNetwork } from '../network/with-network';
import { apiError, apiPath, bearerToken, readJson, validationError } from './http';
import { authenticate } from './session';

const GUEST_HEADER = 'x-guest-cart';

/** Chave do carrinho no banco: um por usuário, um por `guestCartId`. */
const userKey = (userId: string) => `user:${userId}`;
const guestKey = (guestCartId: string) => `guest:${guestCartId}`;

type Owner = { key: string; userId: string | null };

/**
 * Dono do carrinho: com `Authorization`, sempre o usuário (token inválido/vencido → 401, nunca
 * cai para o visitante); sem token, o `X-Guest-Cart`; sem nenhum dos dois → 400.
 */
function resolveOwner(request: Request): Owner | Response {
  if (bearerToken(request)) {
    const auth = authenticate(request);
    if (auth instanceof Response) return auth;
    return { key: userKey(auth.user.id), userId: auth.user.id };
  }
  const guestCartId = request.headers.get(GUEST_HEADER)?.trim();
  if (!guestCartId) return apiError(400, 'VALIDATION_ERROR', 'Carrinho não identificado.');
  return { key: guestKey(guestCartId), userId: null };
}

function emptyCart(d: MockDb, owner: Owner): CartRecord {
  return {
    id: nextId(d, 'cart'),
    userId: owner.userId,
    items: [],
    couponCode: null,
    updatedAt: new Date().toISOString(),
  };
}

/** Carrinho do dono, criado vazio na primeira escrita. Use dentro de `db.update`. */
function cartFor(d: MockDb, owner: Owner): CartRecord {
  d.carts[owner.key] ??= emptyCart(d, owner);
  return d.carts[owner.key]!;
}

function findEdition(d: MockDb, nftId: string, editionId: string) {
  const nft = d.nfts.find((n) => n.id === nftId);
  const edition = nft?.editions.find((e) => e.id === editionId);
  return nft && edition ? { nft, edition } : null;
}

/** Projeção pública: preço e disponibilidade atuais da edição; itens de NFTs removidos somem. */
function toCart(d: MockDb, record: CartRecord | undefined): Cart {
  const items: CartItem[] = [];
  for (const item of record?.items ?? []) {
    const found = findEdition(d, item.nftId, item.editionId);
    if (!found) continue;
    items.push({
      id: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      editionLabel: found.edition.label,
      quantity: item.quantity,
      unitPrice: found.edition.price,
      available: found.edition.available,
      nft: toListItem(found.nft),
    });
  }
  return {
    id: record?.id ?? 'cart-new',
    items,
    couponCode: record?.couponCode ?? null,
    updatedAt: record?.updatedAt ?? new Date(0).toISOString(),
  };
}

const conflict = (available: number) =>
  apiError(
    409,
    'AVAILABILITY_CONFLICT',
    available > 0 ? `Só há ${available} disponíveis desta edição.` : 'Esta edição esgotou.',
    { details: { available } },
  );

const touch = (cart: CartRecord) => {
  cart.updatedAt = new Date().toISOString();
};

export const cartHandlers = [
  http.get(
    apiPath('/cart'),
    withNetwork(({ request }) => {
      const owner = resolveOwner(request);
      if (owner instanceof Response) return owner;
      const d = db.get();
      return HttpResponse.json(toCart(d, d.carts[owner.key]));
    }),
  ),

  http.post(
    apiPath('/cart/items'),
    withNetwork(async ({ request }) => {
      const owner = resolveOwner(request);
      if (owner instanceof Response) return owner;
      const parsed = AddCartItemInputSchema.safeParse(await readJson(request));
      if (!parsed.success) return validationError(parsed.error);

      const { nftId, editionId, quantity } = parsed.data;
      const found = findEdition(db.get(), nftId, editionId);
      if (!found) return apiError(404, 'NOT_FOUND', 'NFT ou edição não encontrado.');

      const existing = db
        .get()
        .carts[owner.key]?.items.find((i) => i.nftId === nftId && i.editionId === editionId);
      const total = (existing?.quantity ?? 0) + quantity;
      if (total > found.edition.available) return conflict(found.edition.available);

      let body: Cart | undefined;
      db.update((d) => {
        const cart = cartFor(d, owner);
        const line = cart.items.find((i) => i.nftId === nftId && i.editionId === editionId);
        if (line) line.quantity = total;
        else
          cart.items.push({
            id: nextId(d, 'item'),
            nftId,
            editionId,
            quantity,
            addedAt: new Date().toISOString(),
          });
        touch(cart);
        body = toCart(d, cart);
      });
      return HttpResponse.json(body);
    }),
  ),

  http.patch(
    apiPath('/cart/items/:itemId'),
    withNetwork(async ({ request, params }) => {
      const owner = resolveOwner(request);
      if (owner instanceof Response) return owner;
      const parsed = UpdateCartItemInputSchema.safeParse(await readJson(request));
      if (!parsed.success) return validationError(parsed.error);

      const current = db.get();
      const line = current.carts[owner.key]?.items.find((i) => i.id === params.itemId);
      if (!line) return apiError(404, 'NOT_FOUND', 'Item não está no carrinho.');
      const found = findEdition(current, line.nftId, line.editionId);
      if (!found) return apiError(404, 'NOT_FOUND', 'NFT ou edição não encontrado.');
      if (parsed.data.quantity > found.edition.available) return conflict(found.edition.available);

      let body: Cart | undefined;
      db.update((d) => {
        const cart = cartFor(d, owner);
        const item = cart.items.find((i) => i.id === params.itemId);
        if (item) item.quantity = parsed.data.quantity;
        touch(cart);
        body = toCart(d, cart);
      });
      return HttpResponse.json(body);
    }),
  ),

  http.delete(
    apiPath('/cart/items/:itemId'),
    withNetwork(({ request, params }) => {
      const owner = resolveOwner(request);
      if (owner instanceof Response) return owner;
      if (!db.get().carts[owner.key]?.items.some((i) => i.id === params.itemId)) {
        return apiError(404, 'NOT_FOUND', 'Item não está no carrinho.');
      }
      let body: Cart | undefined;
      db.update((d) => {
        const cart = cartFor(d, owner);
        cart.items = cart.items.filter((i) => i.id !== params.itemId);
        touch(cart);
        body = toCart(d, cart);
      });
      return HttpResponse.json(body);
    }),
  ),

  /**
   * Une o carrinho de visitante ao do usuário logado. Linhas iguais somam; o que passar do
   * disponível é limitado e volta em `adjustments`. O carrinho de visitante é consumido — repetir
   * o merge não duplica itens.
   */
  http.post(
    apiPath('/cart/merge'),
    withNetwork(async ({ request }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const parsed = MergeCartInputSchema.safeParse(await readJson(request));
      if (!parsed.success) return validationError(parsed.error);

      const owner: Owner = { key: userKey(auth.user.id), userId: auth.user.id };
      const adjustments: CartAdjustment[] = [];
      let body: MergeCartResponse | undefined;
      db.update((d) => {
        const guestItems: CartItemRecord[] = d.carts[guestKey(parsed.data.guestCartId)]?.items ?? [];
        const cart = cartFor(d, owner);
        for (const guestItem of guestItems) {
          const { nftId, editionId } = guestItem;
          const found = findEdition(d, nftId, editionId);
          const line = cart.items.find((i) => i.nftId === nftId && i.editionId === editionId);
          const requested = (line?.quantity ?? 0) + guestItem.quantity;
          const applied = Math.min(requested, found?.edition.available ?? 0);
          if (applied < requested) adjustments.push({ nftId, editionId, requested, applied });
          // Edição esgotada: a linha que o usuário já tinha fica como está (a cotação aponta a falta).
          if (line && applied > 0) line.quantity = applied;
          else if (!line && applied > 0)
            cart.items.push({ ...guestItem, id: nextId(d, 'item'), quantity: applied });
        }
        delete d.carts[guestKey(parsed.data.guestCartId)];
        touch(cart);
        body = { cart: toCart(d, cart), adjustments };
      });
      return HttpResponse.json(body);
    }),
  ),
];
