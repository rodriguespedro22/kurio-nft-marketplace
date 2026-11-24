import axios, { type AxiosRequestConfig } from 'axios';
import type { z } from 'zod';

import { ApiError, toApiError } from './api-error';

const RAW_API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

/** Base absoluta: `fetch` fora do navegador (testes) não aceita URL relativa. */
function resolveApiUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw) || typeof window === 'undefined') return raw;
  return new URL(raw, window.location.origin).href.replace(/\/$/, '');
}

const API_URL = resolveApiUrl(RAW_API_URL);

// Adapter `fetch`: timeout e cancelamento (signal do Query) por AbortSignal, com o mesmo
// comportamento no navegador (Service Worker do MSW) e nos testes (msw/node).
export const apiClient = axios.create({
  adapter: 'fetch',
  baseURL: API_URL,
  timeout: 8000,
  headers: { Accept: 'application/json' },
});

let getAuthToken: () => string | null = () => null;
let getGuestCart: () => string | null = () => null;
const unauthorizedListeners = new Set<(err: ApiError) => void>();

/** Quem conhece a sessão (features/auth) informa o token; lido a cada requisição. */
export function setAuthTokenGetter(fn: () => string | null): void {
  getAuthToken = fn;
}

/** Id do carrinho de visitante — enviado sempre, inclusive logado (permite o merge no login). */
export function setGuestCartGetter(fn: () => string | null): void {
  getGuestCart = fn;
}

/** Notificado em 401 de requisição que levava token (sessão expirada/revogada no servidor). */
export function onUnauthorized(fn: (err: ApiError) => void): () => void {
  unauthorizedListeners.add(fn);
  return () => {
    unauthorizedListeners.delete(fn);
  };
}

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  else config.headers.delete('Authorization');

  const guestCart = getGuestCart();
  if (guestCart) config.headers.set('X-Guest-Cart', guestCart);
  return config;
});

apiClient.interceptors.response.use(undefined, (error: unknown) => {
  const apiError = toApiError(error);
  const sentToken = axios.isAxiosError(error) && Boolean(error.config?.headers?.get?.('Authorization'));
  if (apiError.status === 401 && sentToken) {
    for (const listener of [...unauthorizedListeners]) listener(apiError);
  }
  return Promise.reject(apiError);
});

/**
 * Executa a requisição e valida o corpo com o schema do contrato. Uma resposta 2xx fora do
 * contrato vira `UNKNOWN` — o dado inválido nunca chega à UI nem ao erro.
 */
export async function request<T>(cfg: AxiosRequestConfig, schema: z.ZodType<T>): Promise<T> {
  let response;
  try {
    response = await apiClient.request<unknown>(cfg);
  } catch (error) {
    throw toApiError(error);
  }
  const parsed = schema.safeParse(response.data);
  if (!parsed.success) {
    throw new ApiError({
      status: response.status,
      code: 'UNKNOWN',
      message: 'Resposta inesperada do servidor.',
    });
  }
  return parsed.data;
}
