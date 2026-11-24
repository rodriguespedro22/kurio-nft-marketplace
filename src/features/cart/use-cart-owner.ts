import type { QuoteInput } from '@/contracts';
import { getGuestCartId, useSession, type Session } from '@/features/auth/session';
import { qk } from '@/shared/api/query-keys';

export type CartOwner = { kind: 'user'; userId: string } | { kind: 'guest'; guestCartId: string };

export function cartOwnerOf(session: Session | null): CartOwner {
  return session
    ? { kind: 'user', userId: session.user.id }
    : { kind: 'guest', guestCartId: getGuestCartId() };
}

/** De quem é o carrinho agora: usuário logado ou visitante (id persistido em localStorage). */
export function useCartOwner(): CartOwner {
  return cartOwnerOf(useSession());
}

/** Key do carrinho do dono — privada (`['user', id]`) ou do visitante (`['guest', id]`). */
export const cartKey = (owner: CartOwner) =>
  owner.kind === 'user' ? qk.user(owner.userId).cart : qk.guest(owner.guestCartId).cart;

/** Key da cotação do dono para a entrada dada (rede). */
export const quoteKey = (owner: CartOwner, input: QuoteInput) =>
  owner.kind === 'user' ? qk.user(owner.userId).quote(input) : qk.guest(owner.guestCartId).quote(input);

/** Prefixo de todas as cotações do dono — invalidado a cada mudança no carrinho. */
export const quotePrefix = (owner: CartOwner) =>
  owner.kind === 'user'
    ? (['user', owner.userId, 'quote'] as const)
    : (['guest', owner.guestCartId, 'quote'] as const);
