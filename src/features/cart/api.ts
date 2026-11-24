import {
  CartSchema,
  MergeCartResponseSchema,
  type AddCartItemInput,
  type Cart,
  type MergeCartResponse,
} from '@/contracts';
import { request } from '@/shared/api/client';

const itemPath = (itemId: string) => `/cart/items/${encodeURIComponent(itemId)}`;

/** O dono (usuário ou visitante) vai nos headers do client: `Authorization` / `X-Guest-Cart`. */
export const cartApi = {
  get: (signal?: AbortSignal): Promise<Cart> => request({ url: '/cart', signal }, CartSchema),

  add: (input: AddCartItemInput): Promise<Cart> =>
    request({ url: '/cart/items', method: 'POST', data: input }, CartSchema),

  update: (itemId: string, quantity: number): Promise<Cart> =>
    request({ url: itemPath(itemId), method: 'PATCH', data: { quantity } }, CartSchema),

  remove: (itemId: string): Promise<Cart> => request({ url: itemPath(itemId), method: 'DELETE' }, CartSchema),

  merge: (guestCartId: string): Promise<MergeCartResponse> =>
    request({ url: '/cart/merge', method: 'POST', data: { guestCartId } }, MergeCartResponseSchema),
};
