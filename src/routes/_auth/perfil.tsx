import { createFileRoute } from '@tanstack/react-router';

import { useSession } from '@/features/auth/session';

export const Route = createFileRoute('/_auth/perfil')({
  component: ProfilePage,
});

// Provisório: a tela completa de perfil (formulário, avatar, senha) vem a seguir.
function ProfilePage() {
  const session = useSession();

  return (
    <section className="container-page flex flex-col gap-6 py-10">
      <title>Meu perfil · Kurio</title>
      <h1 className="text-h1 font-bold">Meu perfil</h1>
      {session ? (
        <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-6 text-body-sm">
          <dt className="text-muted">Nome de exibição</dt>
          <dd>{session.user.displayName}</dd>
          <dt className="text-muted">Nome de usuário</dt>
          <dd>{session.user.username}</dd>
          <dt className="text-muted">E-mail</dt>
          <dd>{session.user.email}</dd>
        </dl>
      ) : null}
    </section>
  );
}
