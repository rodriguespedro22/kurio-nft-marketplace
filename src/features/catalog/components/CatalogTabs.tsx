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
      <ul className="flex items-center gap-4 whitespace-nowrap sm:gap-5">
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
                'relative inline-flex min-h-11 items-center text-body-sm text-foreground transition-colors hover:text-accent sm:text-body-lg xl:text-body',
                'data-[status=active]:font-bold data-[status=active]:text-accent',
                'after:absolute after:inset-x-0 after:bottom-1.5 after:h-[3px] after:rounded-full after:bg-primary after:opacity-0 data-[status=active]:after:opacity-100',
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
