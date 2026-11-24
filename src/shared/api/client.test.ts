import { delay, http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import { apiPath } from '@/mocks/handlers/http';
import { server } from '@/mocks/node';

import { ApiError } from './api-error';
import { onUnauthorized, request, setAuthTokenGetter, setGuestCartGetter } from './client';

const Ok = z.object({ ok: z.literal(true) });

let lastHeaders: Headers | null = null;

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error('a requisição deveria ter falhado');
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  lastHeaders = null;
  setAuthTokenGetter(() => null);
  setGuestCartGetter(() => 'guest-123');
  server.use(
    http.get(apiPath('/__test/echo'), ({ request: req }) => {
      lastHeaders = req.headers;
      return HttpResponse.json({ ok: true });
    }),
    http.post(apiPath('/__test/validation'), () =>
      HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', fields: { email: 'Inválido' } } },
        { status: 422 },
      ),
    ),
    http.get(apiPath('/__test/slow'), async () => {
      await delay(500);
      return HttpResponse.json({ ok: true });
    }),
    http.get(apiPath('/__test/malformed'), () => HttpResponse.json({ ok: 'sim', secret: 'vazou' })),
    http.get(apiPath('/__test/expired'), () =>
      HttpResponse.json(
        { error: { code: 'SESSION_EXPIRED', message: 'Sua sessão expirou.' } },
        { status: 401 },
      ),
    ),
  );
});
afterEach(() => server.resetHandlers());

describe('request()', () => {
  test('422 com envelope → ApiError com fields por campo', async () => {
    const error = await failure(request({ method: 'POST', url: '/__test/validation' }, Ok));
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    expect(error.fields?.email).toBe('Inválido');
  });

  test('timeout do axios → code TIMEOUT', async () => {
    const error = await failure(request({ url: '/__test/slow', timeout: 50 }, Ok));
    expect(error.code).toBe('TIMEOUT');
  });

  test('200 fora do schema → code UNKNOWN sem vazar o dado inválido', async () => {
    const error = await failure(request({ url: '/__test/malformed' }, Ok));
    expect(error).toMatchObject({ status: 200, code: 'UNKNOWN' });
    expect(JSON.stringify({ ...error, message: error.message })).not.toContain('vazou');
  });

  test('resposta válida é devolvida já parseada', async () => {
    await expect(request({ url: '/__test/echo' }, Ok)).resolves.toEqual({ ok: true });
  });
});

describe('headers', () => {
  test('sem token: sem Authorization, com X-Guest-Cart', async () => {
    await request({ url: '/__test/echo' }, Ok);
    expect(lastHeaders?.get('authorization')).toBeNull();
    expect(lastHeaders?.get('x-guest-cart')).toBe('guest-123');
  });

  test('com token: Authorization Bearer e X-Guest-Cart continua presente', async () => {
    setAuthTokenGetter(() => 'tok-abc');
    await request({ url: '/__test/echo' }, Ok);
    expect(lastHeaders?.get('authorization')).toBe('Bearer tok-abc');
    expect(lastHeaders?.get('x-guest-cart')).toBe('guest-123');
  });

  test('o token é lido a cada requisição (logout remove o header)', async () => {
    let token: string | null = 'tok-abc';
    setAuthTokenGetter(() => token);
    await request({ url: '/__test/echo' }, Ok);
    token = null;
    await request({ url: '/__test/echo' }, Ok);
    expect(lastHeaders?.get('authorization')).toBeNull();
  });
});

describe('onUnauthorized()', () => {
  test('401 de requisição autenticada notifica os ouvintes; unsubscribe para de notificar', async () => {
    setAuthTokenGetter(() => 'tok-abc');
    const seen: string[] = [];
    const unsubscribe = onUnauthorized((err) => seen.push(err.code));

    await failure(request({ url: '/__test/expired' }, Ok));
    expect(seen).toEqual(['SESSION_EXPIRED']);

    unsubscribe();
    await failure(request({ url: '/__test/expired' }, Ok));
    expect(seen).toEqual(['SESSION_EXPIRED']);
  });

  test('skipUnauthorizedHandler: o chamador trata o 401 e ninguém é notificado', async () => {
    setAuthTokenGetter(() => 'tok-abc');
    const seen: string[] = [];
    const unsubscribe = onUnauthorized((err) => seen.push(err.code));
    const error = await failure(request({ url: '/__test/expired', skipUnauthorizedHandler: true }, Ok));
    expect(error.code).toBe('SESSION_EXPIRED');
    expect(seen).toEqual([]);
    unsubscribe();
  });

  test('401 sem token enviado (ex.: login com senha errada) não notifica', async () => {
    const seen: string[] = [];
    const unsubscribe = onUnauthorized((err) => seen.push(err.code));
    await failure(request({ url: '/__test/expired' }, Ok));
    expect(seen).toEqual([]);
    unsubscribe();
  });
});
