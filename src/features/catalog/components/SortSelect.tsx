import { useId } from 'react';

import { CATALOG_SORTS, type CatalogSearch } from '@/contracts';
import { cn } from '@/shared/lib/utils';
import { Select } from '@/shared/ui/select';

import { useCatalogSearch, useUpdateCatalogSearch } from '../use-catalog-search';

type Sort = NonNullable<CatalogSearch['sort']>;

const isSort = (value: string): value is Sort => (CATALOG_SORTS as readonly string[]).includes(value);

export function SortSelect({ className }: { className?: string }) {
  const id = useId();
  const { sort, tab } = useCatalogSearch();
  const updateSearch = useUpdateCatalogSearch();
  const trending = tab === 'trending';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label htmlFor={id} className="text-body whitespace-nowrap text-foreground">
        Ordenar por:
      </label>
      <Select
        id={id}
        value={sort ?? ''}
        onChange={(event) =>
          updateSearch({ sort: isSort(event.target.value) ? event.target.value : undefined })
        }
        className="w-60"
      >
        {/* Sem sort explícito, vale a ordem da aba: recentes, ou mais populares em "Em alta". */}
        <option value="">{trending ? 'Mais populares' : 'Listados recentemente'}</option>
        {trending ? <option value="recent">Listados recentemente</option> : null}
        <option value="price_asc">Menor preço</option>
        <option value="price_desc">Maior preço</option>
        <option value="name">Nome (A–Z)</option>
      </Select>
    </div>
  );
}
