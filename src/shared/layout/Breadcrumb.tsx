import { Link } from '@tanstack/react-router';

import { cn } from '@/shared/lib/utils';

type BreadcrumbProps = {
  current: string;
  /** No detalhe do NFT a trilha para em "Mercado": o nome da página fica só para o leitor de tela. */
  hideCurrent?: boolean;
  className?: string;
};

/** Trilha "Início / Mercado / <página>" (desktop e tablet). */
export function Breadcrumb({ current, hideCurrent = false, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Trilha de navegação" className={cn('hidden md:block', className)}>
      <ol className="flex items-center gap-[1ch] text-body leading-4 font-bold text-foreground">
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
        {hideCurrent ? null : <li aria-hidden="true">/</li>}
        <li aria-current="page" className={hideCurrent ? 'sr-only' : 'truncate'}>
          {current}
        </li>
      </ol>
    </nav>
  );
}
