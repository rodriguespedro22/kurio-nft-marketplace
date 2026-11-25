import axios from 'axios';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { AVATAR_MAX_BYTES, ProfileSchema, type UpdateProfileInput } from '@/contracts';
import { ApiError, toApiError, type ApiErrorCode } from '@/shared/api/api-error';

import { db } from '../db/store';
import { resetNetworkState } from '../network/with-network';
import { server } from '../node';

const client = axios.create({ baseURL: '/api' });
const PASSWORD = 'Kurio@2026';
const NEW_PASSWORD = 'Nova@Senha26';
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
  (c) => c.charCodeAt(0),
);

async function tokenFor(email: string, password = PASSWORD): Promise<string> {
  const res = await client.post('/auth/login', { email, password });
  return (res.data as { token: string }).token;
}

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

async function expectError(promise: Promise<unknown>, status: number, code: string) {
  try {
    await promise;
    throw new Error('deveria falhar');
  } catch (error) {
    const apiError = toApiError(error);
    expect(apiError).toMatchObject({ status, code });
    return apiError;
  }
}

const profileInput = (overrides: Partial<UpdateProfileInput> = {}): UpdateProfileInput => ({
  displayName: 'Colecionador Kurio',
  username: 'colecionador',
  email: 'colecionador@kurio.test',
  ensName: 'colecionador.eth',
  walletLabel: 'Principal',
  ...overrides,
});

/** Upload multipart como o navegador envia (corpo montado à mão: o FormData do jsdom não é o nativo). */
async function avatarUpload(token: string, bytes: Uint8Array, type: string, name = 'avatar.png') {
  const boundary = '----kurio-test-boundary';
  const crlf = String.fromCharCode(13, 10);
  const encoder = new TextEncoder();
  const head = encoder.encode(
    [
      `--${boundary}`,
      `Content-Disposition: form-data; name="avatar"; filename="${name}"`,
      `Content-Type: ${type}`,
      '',
      '',
    ].join(crlf),
  );
  const tail = encoder.encode(`${crlf}--${boundary}--${crlf}`);
  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head, 0);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);

  // fetch nativo: o XHR do jsdom (adaptador do axios) não entrega o corpo binário intacto.
  const response = await fetch(new URL('/api/me/avatar', window.location.href), {
    method: 'POST',
    body,
    headers: { ...auth(token).headers, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const { error } = data as {
      error: { code: ApiErrorCode; message: string; fields?: Record<string, string> };
    };
    throw new ApiError({ status: response.status, ...error });
  }
  return { data };
}

beforeAll(async () => {
  // O parser multipart do fetch (undici) só aceita o File nativo do Node, não o do jsdom.
  // Módulo resolvido em runtime: os tipos do app não incluem `@types/node`.
  const nodeBuffer = 'node:buffer';
  const { File: NodeFile } = (await import(/* @vite-ignore */ nodeBuffer)) as { File: typeof File };
  vi.stubGlobal('File', NodeFile);
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  db.reset('default');
  resetNetworkState();
});
afterEach(() => server.resetHandlers());

describe('perfil', () => {
  test('GET /me devolve o perfil (com ENS e apelido) sem o hash da senha', async () => {
    const res = await client.get('/me', auth(await tokenFor('colecionador@kurio.test')));
    const profile = ProfileSchema.parse(res.data);
    expect(profile).toMatchObject({
      username: 'colecionador',
      ensName: 'colecionador.eth',
      walletLabel: 'Principal',
    });
    expect(res.data).not.toHaveProperty('passwordHash');
    await expectError(client.get('/me'), 401, 'UNAUTHENTICATED');
  });

  test('PATCH /me salva; nome de usuário ou e-mail de outro usuário → 409 com o campo', async () => {
    const token = await tokenFor('colecionador@kurio.test');
    const saved = ProfileSchema.parse(
      (await client.patch('/me', profileInput({ displayName: 'Colecionador Lendário' }), auth(token))).data,
    );
    expect(saved.displayName).toBe('Colecionador Lendário');
    expect(ProfileSchema.parse((await client.get('/me', auth(token))).data).displayName).toBe(
      'Colecionador Lendário',
    );

    const username = await expectError(
      client.patch('/me', profileInput({ username: 'ANA' }), auth(token)),
      409,
      'CONFLICT',
    );
    expect(username.fields).toEqual({ username: 'Nome de usuário já em uso' });
    const email = await expectError(
      client.patch('/me', profileInput({ email: 'ana@kurio.test' }), auth(token)),
      409,
      'EMAIL_TAKEN',
    );
    expect(email.fields).toEqual({ email: 'E-mail já cadastrado' });

    const invalid = await expectError(
      client.patch('/me', profileInput({ ensName: 'x' }), auth(token)),
      422,
      'VALIDATION_ERROR',
    );
    expect(invalid.fields).toHaveProperty('ensName');
  });

  test('avatar: PNG vira data URL; acima de 2 MB ou outro tipo → 422 em `avatar`; DELETE remove', async () => {
    const token = await tokenFor('colecionador@kurio.test');

    const saved = ProfileSchema.parse((await avatarUpload(token, PNG, 'image/png')).data);
    // O banco guarda a data URL; a API expõe uma URL curta (cabe na sessão em localStorage).
    expect(saved.avatarUrl).toMatch(/^\/api\/avatars\/user-1\?v=/);
    expect(db.get().users.find((u) => u.id === 'user-1')!.avatarUrl).toMatch(
      /^data:image\/png;base64,iVBORw0KGgo/,
    );
    const image = await fetch(new URL(saved.avatarUrl!, window.location.href));
    expect(image.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(PNG);

    const big = await expectError(
      avatarUpload(token, new Uint8Array(AVATAR_MAX_BYTES + 1), 'image/png'),
      422,
      'VALIDATION_ERROR',
    );
    expect(big.fields).toEqual({ avatar: 'A imagem deve ter até 2 MB.' });
    const gif = await expectError(avatarUpload(token, PNG, 'image/gif', 'a.gif'), 422, 'VALIDATION_ERROR');
    expect(gif.fields).toEqual({ avatar: 'Use uma imagem PNG, JPEG ou WebP.' });

    const removed = ProfileSchema.parse((await client.delete('/me/avatar', auth(token))).data);
    expect(removed.avatarUrl).toBeNull();
    expect((await fetch(new URL(saved.avatarUrl!, window.location.href))).status).toBe(404);
  });

  test('senha: atual errada → 422 em `currentPassword`; troca válida encerra as sessões e só a nova entra', async () => {
    const token = await tokenFor('ana@kurio.test');
    const change = {
      currentPassword: 'Errada@2026',
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    };

    const wrong = await expectError(
      client.post('/me/password', change, auth(token)),
      422,
      'VALIDATION_ERROR',
    );
    expect(wrong.fields).toEqual({ currentPassword: 'Senha atual incorreta' });

    const ok = await client.post('/me/password', { ...change, currentPassword: PASSWORD }, auth(token));
    expect(ok.status).toBe(204);
    await expectError(client.get('/me', auth(token)), 401, 'UNAUTHENTICATED');
    await expectError(tokenFor('ana@kurio.test'), 401, 'UNAUTHENTICATED');
    expect(await tokenFor('ana@kurio.test', NEW_PASSWORD)).toBeTruthy();
    expect(db.get().users.find((u) => u.id === 'user-2')!.passwordHash).toMatch(/^pbkdf2-sha256\$100000\$/);
  });
});
