import type { CatalogSearch, QuoteInput } from '@/contracts';

/**
 * Fábrica de query keys. Tudo que é privado começa com `['user', userId]` — logout/troca de
 * usuário remove esse prefixo inteiro (`removeQueries({ queryKey: ['user'] })`).
 */
export const qk = {
  categories: () => ['categories'] as const,
  facets: () => ['facets'] as const,
  catalog: (params: CatalogSearch) => ['catalog', params] as const,
  featured: () => ['featured'] as const,
  nft: (id: string) => ['nft', id] as const,
  user: (userId: string) => ({
    all: ['user', userId] as const,
    session: ['user', userId, 'session'] as const,
    cart: ['user', userId, 'cart'] as const,
    quote: (input: QuoteInput) => ['user', userId, 'quote', input] as const,
    favorites: ['user', userId, 'favorites'] as const,
    profile: ['user', userId, 'profile'] as const,
    wallets: ['user', userId, 'wallets'] as const,
    order: (id: string) => ['user', userId, 'order', id] as const,
  }),
  guest: (guestCartId: string) => ({
    cart: ['guest', guestCartId, 'cart'] as const,
    quote: (input: QuoteInput) => ['guest', guestCartId, 'quote', input] as const,
  }),
};
