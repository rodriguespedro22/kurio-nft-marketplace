import { Link } from '@tanstack/react-router';

import { cn } from '@/shared/lib/utils';

/** Trilha "Início / Mercado / <página>" do layout (desktop e tablet). */
export function Breadcrumb({ current, className }: { current: string; className?: string }) {
  return (
    <nav aria-label="Trilha de navegação" className={cn('hidden md:block', className)}>
      <ol className="flex items-center gap-2 text-body-sm font-bold text-foreground">
        <li>
          <Link to="/" className="hover:text-accent">
            Início
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/" hash="catalogo" className="hover:text-accent">
            Mercado
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="truncate font-normal text-secondary">
          {current}
        </li>
      </ol>
    </nav>
  );
}
