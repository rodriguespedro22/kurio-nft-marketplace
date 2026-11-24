import { CartSchema, QuoteSchema, type Cart, type Quote, type QuoteInput } from '@/contracts';
import { request } from '@/shared/api/client';

export const quoteApi = {
  /** Cria uma cotação do carrinho atual (itens e cupom vêm do servidor). */
  create: (input: QuoteInput, signal?: AbortSignal): Promise<Quote> =>
    request({ url: '/quotes', method: 'POST', data: input, signal }, QuoteSchema),
};

export const couponApi = {
  apply: (code: string): Promise<Cart> =>
    request({ url: '/cart/coupon', method: 'PUT', data: { code } }, CartSchema),

  remove: (): Promise<Cart> => request({ url: '/cart/coupon', method: 'DELETE' }, CartSchema),
};
