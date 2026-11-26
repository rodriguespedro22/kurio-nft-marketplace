import { SearchX } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { LiveRegion } from '@/shared/ui/live-region';
import { PageError } from '@/shared/ui/page-error';

import { useCatalog } from '../queries';
import { hasActiveFilters, toCatalogParams, type CatalogSearchState } from '../search';
import { useCatalogSearch, useUpdateCatalogSearch } from '../use-catalog-search';
import { CatalogTabs } from './CatalogTabs';
import { CategorySidebar } from './CategorySidebar';
import { FeaturedCard } from './FeaturedCard';
import { NftGrid, NftGridSkeleton } from './NftGrid';
import { FiltersDrawer } from './FiltersDrawer';
import { Pagination } from './Pagination';
import { SearchInput } from './SearchInput';
import { SortSelect } from './SortSelect';
import { useMediaQuery } from '@/shared/lib/use-media-query';

const CLEARED_FILTERS = {
  q: undefined,
  category: undefined,
  network: undefined,
  edition: undefined,
  minPrice: undefined,
  maxPrice: undefined,
} as const;

function CatalogResults({ search }: { search: CatalogSearchState }) {
  const updateSearch = useUpdateCatalogSearch();
  const query = useCatalog(toCatalogParams(search));
  const { data, error, isPending, isError, isPlaceholderData, refetch } = query;

  if (isPending) {
    return (
      <>
        <LiveRegion visuallyHidden>Carregando NFTs…</LiveRegion>
        <NftGridSkeleton />
      </>
    );
  }

  if (isError) return <PageError error={error} onRetry={() => void refetch()} />;

  if (data.items.length === 0 && data.total > 0) {
    return (
      <EmptyState
        title="Esta página não existe"
        description={`O resultado tem ${data.totalPages} ${data.totalPages === 1 ? 'página' : 'páginas'}.`}
        action={<Button onClick={() => updateSearch({ page: 1 })}>Ir para a primeira página</Button>}
      />
    );
  }

  if (data.items.length === 0) {
    const filtered = hasActiveFilters(search);
    return (
      <EmptyState
        icon={<SearchX className="size-6" strokeWidth={1.5} />}
        title="Nenhum NFT encontrado"
        description={
          filtered
            ? 'Nenhum NFT combina com a busca e os filtros atuais. Tente outros termos ou limpe os filtros.'
            : 'O catálogo está vazio no momento. Volte em breve para ver novos lançamentos.'
        }
        action={
          filtered ? <Button onClick={() => updateSearch(CLEARED_FILTERS)}>Limpar filtros</Button> : null
        }
      />
    );
  }

  return (
    <>
      <LiveRegion visuallyHidden>
        {isPlaceholderData ? '' : data.total === 1 ? '1 NFT encontrado' : `${data.total} NFTs encontrados`}
      </LiveRegion>
      <NftGrid items={data.items} busy={isPlaceholderData} />
      <Pagination page={data.page} totalPages={data.totalPages} />
    </>
  );
}

/**
 * Busca + filtros abaixo de 1280 px, no topo da Início como no frame mobile. No desktop o layout não
 * tem barra de busca: ela abre pela lupa do header.
 */
export function CatalogSearchBar() {
  return (
    <div className="flex items-center gap-2 xl:hidden">
      <SearchInput className="flex-1" />
      <FiltersDrawer />
    </div>
  );
}

/** Catálogo da Início: sidebar (desktop), abas, ordenação, grid e paginação. */
export function CatalogSection() {
  const search = useCatalogSearch();

  const tabletUp = useMediaQuery('(min-width: 48rem)');
  return (
    <section
      id="catalogo"
      aria-labelledby="catalogo-title"
      className="grid scroll-mt-20 gap-6 xl:grid-cols-[310px_minmax(0,1fr)] xl:items-start xl:gap-12"
    >
      <h2 id="catalogo-title" className="sr-only">
        Catálogo
      </h2>

      <div className="hidden flex-col gap-6 xl:flex">
        <CategorySidebar />
        <FeaturedCard />
      </div>

      <div className="flex min-w-0 flex-col gap-4 md:gap-6 xl:gap-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between xl:items-start">
          <CatalogTabs />
          {/* No celular a ordenação fica no painel de filtros (o frame mobile não tem a linha). */}
          {tabletUp ? <SortSelect /> : null}
        </div>
        <CatalogResults search={search} />
      </div>
    </section>
  );
}
