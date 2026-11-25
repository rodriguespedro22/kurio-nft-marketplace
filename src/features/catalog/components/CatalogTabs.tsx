import { Link } from '@tanstack/react-router';

import type { CatalogSearch } from '@/contracts';
import { cn } from '@/shared/lib/utils';

import { mergeCatalogSearch } from '../search';

const TABS: ReadonlyArray<{ tab: CatalogSearch['tab']; label: string }> = [
  { tab: undefined, label: 'Todos os NFTs' },
  { tab: 'new', label: 'Novos lançamentos' },
  { tab: 'trending', label: 'Em alta' },
];

/** Abas como links: cada uma é uma URL (compartilhável, com voltar/avançar). */
export function CatalogTabs({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Abas do catálogo"
      className={cn(
        '-mx-1 [scrollbar-width:none] overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <ul className="flex items-center gap-4 whitespace-nowrap sm:gap-5 xl:h-[26px] xl:items-start">
        {TABS.map(({ tab, label }) => (
          <li key={label}>
            <Link
              from="/"
              to="/"
              search={(prev) => mergeCatalogSearch(prev, { tab })}
              resetScroll={false}
              // Ativa só quando a busca inteira coincide (a aba "Todos" não acende em "Em alta").
              activeOptions={{ exact: true }}
              className={cn(
                'relative inline-flex min-h-11 items-center text-body-sm text-foreground transition-colors hover:text-accent sm:text-body-lg',
                'xl:min-h-0 xl:pb-2.5 xl:text-body xl:leading-4 xl:font-medium',
                'data-[status=active]:text-accent max-xl:data-[status=active]:font-bold',
                // Layout: filete de 2 px, 6 px abaixo do texto.
                'after:absolute after:inset-x-0 after:bottom-1.5 after:h-[3px] after:rounded-full after:bg-primary after:opacity-0 data-[status=active]:after:opacity-100 xl:after:bottom-0.5 xl:after:h-0.5 xl:after:rounded-none',
              )}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
