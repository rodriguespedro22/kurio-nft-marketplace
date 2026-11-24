import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

import type { CatalogSearch } from '@/contracts';
import { qk } from '@/shared/api/query-keys';

import { catalogApi } from './api';

export const catalogQueries = {
  list: (params: CatalogSearch) =>
    queryOptions({
      queryKey: qk.catalog(params),
      queryFn: ({ signal }) => catalogApi.list(params, signal),
      // Troca de filtro/página mantém o grid anterior (esmaecido) até a nova resposta chegar.
      placeholderData: keepPreviousData,
    }),
  featured: () =>
    queryOptions({ queryKey: qk.featured(), queryFn: ({ signal }) => catalogApi.featured(signal) }),
  categories: () =>
    queryOptions({ queryKey: qk.categories(), queryFn: ({ signal }) => catalogApi.categories(signal) }),
  facets: () => queryOptions({ queryKey: qk.facets(), queryFn: ({ signal }) => catalogApi.facets(signal) }),
  nft: (id: string) =>
    queryOptions({ queryKey: qk.nft(id), queryFn: ({ signal }) => catalogApi.nft(id, signal) }),
};

export const useCatalog = (params: CatalogSearch) => useQuery(catalogQueries.list(params));
export const useFeatured = () => useQuery(catalogQueries.featured());
export const useCategories = () => useQuery(catalogQueries.categories());
export const useFacets = () => useQuery(catalogQueries.facets());
