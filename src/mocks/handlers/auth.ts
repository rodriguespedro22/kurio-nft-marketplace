import { http, HttpResponse } from 'msw';

import { LoginInputSchema, RegisterInputSchema, type AuthResponse, type SessionInfo } from '@/contracts';

import { nextId } from '../db/ids';
import { hashPassword, verifyPassword } from '../db/password';
import type { SessionRecord, UserRecord } from '../db/schema';
import { db } from '../db/store';
import { withNetwork } from '../network/with-network';
import { getScenario } from '../scenarios';
import { apiError, apiPath, bearerToken, readJson, validationError } from './http';
import { authenticate, createSession, toUser } from './session';

const EMAIL_TAKEN = 'E-mail já cadastrado';
const USERNAME_TAKEN = 'Nome de usuário já em uso';

function authResponse(user: UserRecord, session: SessionRecord): AuthResponse {
  return { token: session.token, user: toUser(user), expiresAt: session.expiresAt };
}

export const authHandlers = [
  http.post(
    apiPath('/auth/register'),
    withNetwork(async ({ request }) => {
      const parsed = RegisterInputSchema.safeParse(await readJson(request));
      if (!parsed.success) return validationError(parsed.error);

      const { username, email, password } = parsed.data;
      const scenario = getScenario();
      const current = db.get();
      if (current.users.some((u) => u.email === email)) {
        return apiError(409, 'EMAIL_TAKEN', `${EMAIL_TAKEN}.`, { fields: { email: EMAIL_TAKEN } });
      }
      const usernameTaken = current.users.some((u) => u.username.toLowerCase() === username.toLowerCase());
      if (usernameTaken || scenario.registerConflictField === 'username') {
        return apiError(409, 'CONFLICT', `${USERNAME_TAKEN}.`, { fields: { username: USERNAME_TAKEN } });
      }

      const passwordHash = await hashPassword(password);
      let response: AuthResponse | undefined;
      db.update((d) => {
        const user: UserRecord = {
          id: nextId(d, 'user'),
          email,
          username,
          displayName: username,
          avatarUrl: null,
          bio: null,
          ensName: null,
          walletLabel: null,
          passwordHash,
          createdAt: new Date().toISOString(),
        };
        d.users.push(user);
        response = authResponse(user, createSession(d, user.id, scenario.sessionTtlMs));
      });
      return HttpResponse.json(response, { status: 201 });
    }),
  ),

  http.post(
    apiPath('/auth/login'),
    withNetwork(async ({ request }) => {
      const parsed = LoginInputSchema.safeParse(await readJson(request));
      if (!parsed.success) return validationError(parsed.error);

      const user = db.get().users.find((u) => u.email === parsed.data.email);
      const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
      // Mensagem genérica: não revela se o e-mail existe.
      if (!user || !valid) return apiError(401, 'UNAUTHENTICATED', 'E-mail ou senha inválidos.');

      const ttl = getScenario().sessionTtlMs;
      let response: AuthResponse | undefined;
      db.update((d) => {
        response = authResponse(user, createSession(d, user.id, ttl));
      });
      return HttpResponse.json(response);
    }),
  ),

  http.get(
    apiPath('/auth/session'),
    withNetwork(({ request }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      const body: SessionInfo = { user: toUser(auth.user), expiresAt: auth.session.expiresAt };
      return HttpResponse.json(body);
    }),
  ),

  http.post(
    apiPath('/auth/logout'),
    withNetwork(({ request }) => {
      const token = bearerToken(request);
      if (token) {
        db.update((d) => {
          d.sessions = d.sessions.filter((s) => s.token !== token);
        });
      }
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];
