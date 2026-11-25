import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

import { CATALOG_SORTS, type CatalogSearch } from '@/contracts';
import { cn } from '@/shared/lib/utils';

import { useCatalogSearch, useUpdateCatalogSearch } from '../use-catalog-search';

type Sort = NonNullable<CatalogSearch['sort']>;

const isSort = (value: string): value is Sort => (CATALOG_SORTS as readonly string[]).includes(value);

/**
 * "Ordenar por: <valor> ⌄" em texto corrido, como no layout. Por baixo é um `<select>` nativo
 * (teclado, leitor de tela e seletor do sistema no celular).
 */
export function SortSelect({ className }: { className?: string }) {
  const id = useId();
  const { sort, tab } = useCatalogSearch();
  const updateSearch = useUpdateCatalogSearch();
  const trending = tab === 'trending';

  return (
    <div className={cn('flex items-center text-body leading-5 text-foreground', className)}>
      <label htmlFor={id} className="whitespace-nowrap">
        Ordenar por:
      </label>
      <div className="relative">
        <select
          id={id}
          value={sort ?? ''}
          onChange={(event) =>
            updateSearch({ sort: isSort(event.target.value) ? event.target.value : undefined })
          }
          className="min-h-11 cursor-pointer appearance-none bg-transparent pr-6 pl-px text-foreground xl:min-h-5 [&>option]:bg-surface"
        >
          {/* Sem sort explícito, vale a ordem da aba: recentes, ou mais populares em "Em alta". */}
          <option value="">{trending ? 'Mais populares' : 'Listados recentemente'}</option>
          {trending ? <option value="recent">Listados recentemente</option> : null}
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
          <option value="name">Nome (A–Z)</option>
        </select>
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.75}
          className="pointer-events-none absolute top-1/2 right-0.5 size-4 -translate-y-1/2"
        />
      </div>
    </div>
  );
}
