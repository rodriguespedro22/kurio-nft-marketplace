import { http, HttpResponse } from 'msw';

import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  ChangePasswordInputSchema,
  UpdateProfileInputSchema,
  type Profile,
} from '@/contracts';

import { hashPassword, verifyPassword } from '../db/password';
import type { UserRecord } from '../db/schema';
import { db } from '../db/store';
import { withNetwork } from '../network/with-network';
import { EMAIL_TAKEN, USERNAME_TAKEN } from './auth';
import { apiError, apiPath, readJson, validationError } from './http';
import { authenticate, toUser } from './session';

export const AVATAR_TOO_BIG = 'A imagem deve ter até 2 MB.';
export const AVATAR_WRONG_TYPE = 'Use uma imagem PNG, JPEG ou WebP.';
export const WRONG_CURRENT_PASSWORD = 'Senha atual incorreta';

function toProfile(user: UserRecord): Profile {
  return { ...toUser(user), ensName: user.ensName, walletLabel: user.walletLabel };
}

/** Atualiza o usuário dentro de `db.update` e devolve o perfil gravado. */
function updateUser(userId: string, change: (user: UserRecord) => void): Profile {
  let saved!: Profile;
  db.update((d) => {
    const user = d.users.find((u) => u.id === userId)!;
    change(user);
    saved = toProfile(user);
  });
  return saved;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const avatarError = (message: string) =>
  apiError(422, 'VALIDATION_ERROR', message, { fields: { avatar: message } });

/** `data:<tipo>;base64,<dados>` → bytes e tipo. */
function fromDataUrl(dataUrl: string): { type: string; bytes: Uint8Array<ArrayBuffer> } | null {
  const match = /^data:([^;,]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  return { type: match[1]!, bytes: Uint8Array.from(atob(match[2]!), (c) => c.charCodeAt(0)) };
}

export const profileHandlers = [
  // Imagem pública (o <img> não manda Authorization), servida a partir da data URL do banco.
  http.get(
    apiPath('/avatars/:userId'),
    withNetwork(({ params }) => {
      const user = db.get().users.find((u) => u.id === String(params.userId));
      const image = user?.avatarUrl ? fromDataUrl(user.avatarUrl) : null;
      if (!image) return apiError(404, 'NOT_FOUND', 'Avatar não encontrado.');
      return new HttpResponse(image.bytes, {
        headers: { 'Content-Type': image.type, 'Cache-Control': 'private, max-age=31536000, immutable' },
      });
    }),
  ),

  http.get(
    apiPath('/me'),
    withNetwork(({ request }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      return HttpResponse.json(toProfile(auth.user));
    }),
  ),

  http.patch(
    apiPath('/me'),
    withNetwork(async ({ request }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const parsed = UpdateProfileInputSchema.safeParse(await readJson(request));
      if (!parsed.success) return validationError(parsed.error);

      const input = parsed.data;
      const others = db.get().users.filter((u) => u.id !== auth.user.id);
      if (others.some((u) => u.username.toLowerCase() === input.username.toLowerCase())) {
        return apiError(409, 'CONFLICT', `${USERNAME_TAKEN}.`, { fields: { username: USERNAME_TAKEN } });
      }
      if (others.some((u) => u.email === input.email)) {
        return apiError(409, 'EMAIL_TAKEN', `${EMAIL_TAKEN}.`, { fields: { email: EMAIL_TAKEN } });
      }
      return HttpResponse.json(updateUser(auth.user.id, (user) => Object.assign(user, input)));
    }),
  ),

  // multipart/form-data, campo `avatar`; guardado como data URL no banco simulado.
  http.post(
    apiPath('/me/avatar'),
    withNetwork(async ({ request }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const file = await request
        .formData()
        .then((form) => form.get('avatar'))
        .catch(() => null);
      // Sem `instanceof File`: o File pode vir de outro realm (Service Worker, undici nos testes).
      if (!file || typeof file === 'string') return avatarError('Escolha uma imagem.');
      if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type))
        return avatarError(AVATAR_WRONG_TYPE);
      if (file.size > AVATAR_MAX_BYTES) return avatarError(AVATAR_TOO_BIG);

      const dataUrl = `data:${file.type};base64,${toBase64(new Uint8Array(await file.arrayBuffer()))}`;
      return HttpResponse.json(
        updateUser(auth.user.id, (user) => {
          user.avatarUrl = dataUrl;
        }),
      );
    }),
  ),

  http.delete(
    apiPath('/me/avatar'),
    withNetwork(({ request }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      return HttpResponse.json(
        updateUser(auth.user.id, (user) => {
          user.avatarUrl = null;
        }),
      );
    }),
  ),

  // Troca válida encerra todas as sessões do usuário: ele entra de novo com a senha nova.
  http.post(
    apiPath('/me/password'),
    withNetwork(async ({ request }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const parsed = ChangePasswordInputSchema.safeParse(await readJson(request));
      if (!parsed.success) return validationError(parsed.error);
      if (!(await verifyPassword(parsed.data.currentPassword, auth.user.passwordHash))) {
        return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos destacados.', {
          fields: { currentPassword: WRONG_CURRENT_PASSWORD },
        });
      }

      const passwordHash = await hashPassword(parsed.data.newPassword);
      db.update((d) => {
        d.users.find((u) => u.id === auth.user.id)!.passwordHash = passwordHash;
        d.sessions = d.sessions.filter((s) => s.userId !== auth.user.id);
      });
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];
