import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';

import { AuthCard } from '@/features/auth/components/AuthCard';
import { HomeContent } from '@/features/catalog/components/HomeContent';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { AuthSearchSchema } from '@/features/auth/search';
import { getSession, isSessionExpired, safeRedirect } from '@/features/auth/session';
import { ensureSessionValidated } from '@/features/auth/sign-out';

export const Route = createFileRoute('/cadastro')({
  validateSearch: AuthSearchSchema,
  beforeLoad: async ({ search }) => {
    await ensureSessionValidated();
    const session = getSession();
    if (session && !isSessionExpired(session)) {
      throw redirect({ href: safeRedirect(search.redirect), replace: true });
    }
  },
  component: RegisterPage,
});

function RegisterPage() {
  const { redirect: target } = Route.useSearch();
  const navigate = useNavigate();
  const search = target ? { redirect: target } : {};

  return (
    <>
      <title>Criar conta · Kurio</title>
      <AuthCard
        backdrop={<HomeContent />}
        active="register"
        redirect={target}
        mobileTitle="Criar perfil de colecionador"
        description="Crie seu perfil de colecionador e conecte uma carteira quando quiser."
        footer={
          <>
            Já tem uma conta?{' '}
            <Link to="/login" search={search} className="font-bold text-accent hover:underline">
              Entre
            </Link>
          </>
        }
      >
        <RegisterForm onSuccess={() => void navigate({ href: safeRedirect(target), replace: true })} />
      </AuthCard>
    </>
  );
}
