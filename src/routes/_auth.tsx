import { createFileRoute, redirect } from '@tanstack/react-router';

import { consumeSignOutReason, getSession, isSessionExpired } from '@/features/auth/session';
import { ensureSessionValidated, signOutLocal } from '@/features/auth/sign-out';

/**
 * Layout protegido (checkout, perfil, carteiras, pedido). Sem sessão válida → `/login` com o
 * destino em `redirect`; quando a sessão acabou de expirar, `motivo=expirada` mostra o aviso.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ location }) => {
    await ensureSessionValidated();
    let session = getSession();
    if (session && isSessionExpired(session)) {
      signOutLocal('expired');
      session = null;
    }
    if (!session) {
      const expired = consumeSignOutReason() === 'expired';
      throw redirect({
        to: '/login',
        search: { redirect: location.href, motivo: expired ? 'expirada' : undefined },
      });
    }
    return { session };
  },
});
