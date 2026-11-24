import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import { pageWindow } from '../pagination';

const linkClass = cn(
  'grid size-11 place-items-center rounded-[4px] border border-border text-body text-foreground transition-colors hover:border-primary hover:text-accent xl:size-[35px]',
  'data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:font-bold data-[status=active]:text-ink',
);

/** Volta ao topo do catálogo (não da página) ao trocar de página. */
function scrollToCatalog() {
  document.getElementById('catalogo')?.scrollIntoView({ block: 'start' });
}

function PageLink({ page, label, children }: { page: number; label: string; children: ReactNode }) {
  return (
    <Link
      from="/"
      to="/"
      search={(prev) => ({ ...prev, page })}
      resetScroll={false}
      activeOptions={{ exact: true }}
      aria-label={label}
      onClick={scrollToCatalog}
      className={linkClass}
    >
      {children}
    </Link>
  );
}

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const slots = pageWindow(page, totalPages);

  return (
    <nav aria-label="Paginação" className="flex justify-center md:justify-end">
      <ul className="flex flex-wrap items-center gap-2">
        {page > 1 ? (
          <li>
            <PageLink page={Math.min(page - 1, totalPages)} label="Página anterior">
              <ChevronLeft aria-hidden="true" className="size-4" />
            </PageLink>
          </li>
        ) : null}
        {slots.map((slot, index) =>
          slot === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={slot}>
              <PageLink page={slot} label={`Página ${slot}`}>
                {slot}
              </PageLink>
            </li>
          ),
        )}
        {page < totalPages ? (
          <li>
            <PageLink page={page + 1} label="Próxima página">
              <ChevronRight aria-hidden="true" className="size-4" />
            </PageLink>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
