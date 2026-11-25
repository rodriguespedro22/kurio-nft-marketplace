import type { User } from '@/contracts';

import { randomToken } from '../db/ids';
import type { MockDb, SessionRecord, UserRecord } from '../db/schema';
import { db } from '../db/store';
import { apiError, apiPath, bearerToken } from './http';

/**
 * URL pública do avatar. O banco guarda a data URL (até ~2,7 MB); expor só esta URL curta mantém o
 * usuário da sessão pequeno no localStorage. `v` muda a cada imagem nova (sem cache velho).
 */
export function avatarPath(record: UserRecord): string | null {
  if (!record.avatarUrl) return null;
  const version = `${record.avatarUrl.length.toString(36)}${record.avatarUrl.slice(-8)}`;
  return `${apiPath(`/avatars/${record.id}`)}?v=${encodeURIComponent(version)}`;
}

/** Projeção pública do usuário (nunca expõe hash de senha nem a data URL do avatar). */
export function toUser(record: UserRecord): User {
  const { id, email, displayName, username, bio } = record;
  return { id, email, displayName, username, avatarUrl: avatarPath(record), bio };
}

/** Cria uma sessão com TTL do cenário. Use dentro de `db.update`. */
export function createSession(d: MockDb, userId: string, ttlMs: number): SessionRecord {
  const now = Date.now();
  const session: SessionRecord = {
    token: randomToken(),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };
  d.sessions.push(session);
  return session;
}

export type AuthContext = { user: UserRecord; session: SessionRecord };

/**
 * Resolve o usuário do `Authorization: Bearer`. Sem token ou token desconhecido → 401
 * `UNAUTHENTICATED`; sessão vencida → 401 `SESSION_EXPIRED`.
 */
export function authenticate(request: Request): AuthContext | Response {
  const token = bearerToken(request);
  const d = db.get();
  const session = token ? d.sessions.find((s) => s.token === token) : undefined;
  const user = session ? d.users.find((u) => u.id === session.userId) : undefined;
  if (!session || !user) {
    return apiError(401, 'UNAUTHENTICATED', 'Entre para continuar.');
  }
  if (Date.parse(session.expiresAt) <= Date.now()) {
    return apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou.');
  }
  return { user, session };
}
