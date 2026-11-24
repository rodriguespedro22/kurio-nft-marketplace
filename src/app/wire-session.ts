import type { QueryClient } from '@tanstack/react-query';

import { consumeSignOutReason, getGuestCartId, getSession, subscribeSession } from '@/features/auth/session';
import { signOutLocal } from '@/features/auth/sign-out';
import { onUnauthorized, setAuthTokenGetter, setGuestCartGetter } from '@/shared/api/client';

import type { createAppRouter } from './router';

type AppRouter = ReturnType<typeof createAppRouter>;

const AUTH_PAGES = /^\/(login|cadastro)(\/|$)/;

/**
 * Liga a sessão ao resto do app: headers do Axios, limpeza do cache privado na troca de usuário
 * e o redirecionamento para o login quando o servidor recusa o token (401). Só assina eventos —
 * nenhuma requisição sai daqui (o MSW pode ainda não estar ativo).
 */
export function wireSession(queryClient: QueryClient, router: AppRouter): () => void {
  setAuthTokenGetter(() => getSession()?.token ?? null);
  setGuestCartGetter(getGuestCartId);

  const offSession = subscribeSession((next, prev) => {
    if (prev?.user.id !== next?.user.id) queryClient.removeQueries({ queryKey: ['user'] });
  });

  const offUnauthorized = onUnauthorized(() => {
    if (!getSession()) return;
    signOutLocal('expired');
    consumeSignOutReason();
    const { href, pathname } = router.state.location;
    if (AUTH_PAGES.test(pathname)) return;
    void router.navigate({ to: '/login', search: { redirect: href, motivo: 'expirada' } });
  });

  return () => {
    offSession();
    offUnauthorized();
  };
}
