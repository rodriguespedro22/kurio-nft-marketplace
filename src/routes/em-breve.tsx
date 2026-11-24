import { createFileRoute, Link } from '@tanstack/react-router';
import { Hourglass } from 'lucide-react';
import { z } from 'zod';

import { COMING_SOON_KEYS, COMING_SOON_SECTIONS } from '@/shared/layout/coming-soon';
import { buttonVariants } from '@/shared/ui/button-variants';
import { EmptyState } from '@/shared/ui/empty-state';

const searchSchema = z.object({
  secao: z.enum(COMING_SOON_KEYS).optional().catch(undefined),
});

export const Route = createFileRoute('/em-breve')({
  validateSearch: searchSchema,
  component: ComingSoonPage,
});

function ComingSoonPage() {
  const { secao } = Route.useSearch();
  const label = secao ? COMING_SOON_SECTIONS[secao] : 'Esta seção';

  return (
    <section className="container-page py-16">
      <title>Em breve · Kurio</title>
      <EmptyState
        titleAs="h1"
        icon={<Hourglass className="size-6" strokeWidth={1.5} />}
        title="Em breve"
        description={`${label} ainda não está disponível nesta demonstração. Nada foi enviado nem salvo.`}
        action={
          <Link to="/" className={buttonVariants()}>
            Voltar para o Início
          </Link>
        }
      />
    </section>
  );
}
