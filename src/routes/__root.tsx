import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet, useMatches } from '@tanstack/react-router';
import { Compass } from 'lucide-react';

import { Footer } from '@/shared/layout/Footer';
import { Header } from '@/shared/layout/Header';
import { MobileNav } from '@/shared/layout/MobileNav';
import { buttonVariants } from '@/shared/ui/button-variants';
import { EmptyState } from '@/shared/ui/empty-state';

export type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

function RootLayout() {
  const phoneBottomBar = useMatches({
    select: (matches) => matches.some((match) => match.staticData.phoneBottomBar),
  });
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-field bg-primary px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Header />
      {/* Altura mínima: enquanto a página carrega, o rodapé não sobe para a tela (CLS). */}
      <main id="conteudo" tabIndex={-1} className="min-h-dvh flex-1 outline-none">
        <Outlet />
      </main>
      <Footer phoneBottomBar={phoneBottomBar} />
      <MobileNav hideOnPhone={phoneBottomBar} />
    </div>
  );
}

function NotFoundPage() {
  return (
    <section className="container-page py-16">
      <title>Página não encontrada · Kurio</title>
      <EmptyState
        titleAs="h1"
        icon={<Compass className="size-6" strokeWidth={1.5} />}
        title="Página não encontrada"
        description="O endereço que você abriu não existe ou foi movido."
        action={
          <Link to="/" className={buttonVariants()}>
            Voltar para o Início
          </Link>
        }
      />
    </section>
  );
}
