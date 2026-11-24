import { HttpResponse } from 'msw';

import type { ErrorEnvelope, ServerErrorCode } from '@/contracts';

export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const apiPath = (path: string) => `${API_URL}${path}`;

type ErrorExtras = { fields?: Record<string, string>; details?: unknown };

/** Resposta no envelope único de erro da spec (§5.2). */
export function apiError(status: number, code: ServerErrorCode, message: string, extras: ErrorExtras = {}) {
  const body: ErrorEnvelope = { error: { code, message, ...extras } };
  return HttpResponse.json(body, { status });
}

/** Lê JSON do corpo sem lançar (corpo vazio ou inválido → `null`). */
export async function readJson(request: Request): Promise<unknown> {
  try {
    const text = await request.text();
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] ?? null;
}
