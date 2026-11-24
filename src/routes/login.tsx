import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';

import { AuthCard } from '@/features/auth/components/AuthCard';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { SessionExpiredNotice } from '@/features/auth/components/SessionNotice';
import { AuthSearchSchema } from '@/features/auth/search';
import { getSession, isSessionExpired, safeRedirect } from '@/features/auth/session';
import { ensureSessionValidated } from '@/features/auth/sign-out';

export const Route = createFileRoute('/login')({
  validateSearch: AuthSearchSchema,
  beforeLoad: async ({ search }) => {
    await ensureSessionValidated();
    const session = getSession();
    if (session && !isSessionExpired(session)) {
      throw redirect({ href: safeRedirect(search.redirect), replace: true });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { redirect: target, motivo } = Route.useSearch();
  const navigate = useNavigate();
  const search = target ? { redirect: target } : {};

  return (
    <>
      <title>Entrar · Kurio</title>
      <AuthCard
        active="login"
        redirect={target}
        mobileTitle="Entrar na Kurio"
        description="Entre para gerenciar sua carteira, coleção e perfil de criador."
        notice={motivo === 'expirada' ? <SessionExpiredNotice /> : null}
        footer={
          <>
            Novo na Kurio?{' '}
            <Link to="/cadastro" search={search} className="font-bold text-accent hover:underline">
              Crie uma conta
            </Link>
          </>
        }
      >
        <LoginForm onSuccess={() => void navigate({ href: safeRedirect(target), replace: true })} />
      </AuthCard>
    </>
  );
}
