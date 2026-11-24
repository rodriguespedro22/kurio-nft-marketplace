import { ApiError } from '@/shared/api/api-error';

import { authApi } from './api';
import { clearSession, getSession, setSession, type SignOutReason } from './session';

/** Prefixo dos rascunhos de checkout em sessionStorage: `kurio:checkout:<userId>:…`. */
export const CHECKOUT_DRAFT_PREFIX = 'kurio:checkout:';

/**
 * Saída local: remove os rascunhos de checkout do usuário e encerra a sessão. Quem assina
 * `subscribeSession` reage à troca de usuário — o cache privado (`['user', …]`) é removido
 * em `bindSessionToQueryClient` e o socket se desconecta sozinho.
 * Em `expired` o rascunho fica: o usuário retoma o checkout depois de entrar de novo.
 */
export function signOutLocal(reason: SignOutReason): void {
  const userId = getSession()?.user.id;
  if (userId && reason !== 'expired') {
    try {
      const prefix = `${CHECKOUT_DRAFT_PREFIX}${userId}:`;
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith(prefix)) sessionStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  }
  clearSession(reason);
}

let validation: Promise<void> | null = null;

/**
 * Revalida no servidor, uma vez por carregamento, o token guardado (`GET /auth/session`
 * no boot). 401 → saída com motivo `expired`; falha de rede mantém a sessão local (o próximo
 * request autenticado decide). Guards aguardam esta promessa antes de decidir.
 */
export function ensureSessionValidated(): Promise<void> {
  validation ??= (async () => {
    const stored = getSession();
    if (!stored) return;
    try {
      const info = await authApi.session();
      const latest = getSession();
      if (latest?.token === stored.token)
        setSession({ ...latest, user: info.user, expiresAt: info.expiresAt });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && getSession()?.token === stored.token) {
        signOutLocal('expired');
      }
    }
  })();
  return validation;
}
