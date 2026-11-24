import { useSyncExternalStore } from 'react';

import type { Cart, NftUpdatedEvent } from '@/contracts';
import { cartLineName } from '@/features/cart/labels';
import { cartKey, useCartOwner } from '@/features/cart/use-cart-owner';
import { cmpEth, formatEth } from '@/shared/money/eth';

export type CartNotice =
  | { key: string; cartItemId: string; kind: 'price'; name: string; from: string; to: string }
  | { key: string; cartItemId: string; kind: 'sold_out'; name: string };

export function noticeMessage(notice: CartNotice): string {
  return notice.kind === 'sold_out'
    ? `${notice.name} esgotou`
    : `Preço de ${notice.name} mudou de ${formatEth(notice.from)} para ${formatEth(notice.to)}`;
}

/** Avisos novos e chaves de avisos que deixaram de valer (edição que voltou a ter estoque). */
export type CartChanges = { notices: CartNotice[]; cleared: string[] };

/**
 * O que o evento muda nas linhas do carrinho em cache: esgotou, voltou a ter estoque e/ou mudou
 * de preço. Ignora evento que não é mais novo que o NFT da linha (reentrega ou atraso depois do
 * REST).
 */
export function cartChangesFor(cart: Cart | undefined, event: NftUpdatedEvent): CartChanges {
  const changes: CartChanges = { notices: [], cleared: [] };
  if (!cart) return changes;
  const updates = new Map(event.data.editions.map((e) => [e.id, e]));
  const { notices, cleared } = changes;
  for (const item of cart.items) {
    if (item.nftId !== event.resource.id || event.version <= item.nft.version) continue;
    const update = updates.get(item.editionId);
    if (!update) continue;
    const name = cartLineName(item.nft.name, item.editionLabel);
    const soldOutKey = `${item.id}:sold_out`;
    if (update.available === 0 && item.available > 0) {
      notices.push({ key: soldOutKey, cartItemId: item.id, kind: 'sold_out', name });
    } else if (update.available > 0) {
      cleared.push(soldOutKey);
    }
    if (cmpEth(update.price, item.unitPrice) !== 0) {
      notices.push({
        key: `${item.id}:price`,
        cartItemId: item.id,
        kind: 'price',
        name,
        from: item.unitPrice,
        to: update.price,
      });
    }
  }
  return changes;
}

// ——— Avisos do dono atual do carrinho (só em memória) ———

type State = { owner: string | null; notices: CartNotice[] };
const EMPTY: CartNotice[] = [];
let state: State = { owner: null, notices: EMPTY };
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

/** Troca de dono (login/logout): os avisos do anterior somem. */
export function resetCartNotices(owner: string): void {
  if (state.owner !== owner || state.notices.length > 0) setState({ owner, notices: EMPTY });
}

/**
 * Junta avisos novos: o mesmo item + tipo é substituído (reentrega não duplica). Um preço que
 * volta ao valor de antes do primeiro aviso remove o aviso; `cleared` remove os que não valem mais.
 */
export function addCartNotices(owner: string, { notices: incoming, cleared }: CartChanges): void {
  const current = state.owner === owner ? state.notices : EMPTY;
  if (incoming.length === 0 && !cleared.some((key) => current.some((n) => n.key === key))) return;
  const byKey = new Map(current.map((n) => [n.key, n]));
  for (const key of cleared) byKey.delete(key);
  for (const notice of incoming) {
    const previous = byKey.get(notice.key);
    if (notice.kind === 'price' && previous?.kind === 'price') {
      const merged = { ...notice, from: previous.from };
      if (cmpEth(merged.from, merged.to) === 0) byKey.delete(notice.key);
      else byKey.set(notice.key, merged);
    } else {
      byKey.set(notice.key, notice);
    }
  }
  setState({ owner, notices: [...byKey.values()] });
}

export function dismissCartNotices(): void {
  if (state.notices.length > 0) setState({ ...state, notices: EMPTY });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Identificador do dono atual do carrinho (usuário ou visitante) para os avisos. */
export function useNoticeOwner(): string {
  return cartKey(useCartOwner()).join(':');
}

/** Avisos do dono dado (vazio se os avisos guardados forem de outro dono). */
export function getCartNotices(owner: string): CartNotice[] {
  return state.owner === owner ? state.notices : EMPTY;
}

export function useCartNotices(owner: string): CartNotice[] {
  return useSyncExternalStore(subscribe, () => getCartNotices(owner));
}
