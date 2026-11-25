import {
  CatalogFacetsSchema,
  CategoryListSchema,
  FeaturedNftsSchema,
  NftPageSchema,
  type CatalogFacets,
  type CatalogSearch,
  type Category,
  type NftListItem,
  type Paginated,
} from '@/contracts';
import { request } from '@/shared/api/client';

/** Grade 3 × 3 do layout. */
export const CATALOG_PAGE_SIZE = 9;

export const catalogApi = {
  list: (params: CatalogSearch, signal?: AbortSignal): Promise<Paginated<NftListItem>> =>
    request({ url: '/nfts', params: { ...params, pageSize: CATALOG_PAGE_SIZE }, signal }, NftPageSchema),

  featured: (signal?: AbortSignal): Promise<NftListItem[]> =>
    request({ url: '/nfts/featured', signal }, FeaturedNftsSchema),

  categories: (signal?: AbortSignal): Promise<Category[]> =>
    request({ url: '/categories', signal }, CategoryListSchema),

  facets: (signal?: AbortSignal): Promise<CatalogFacets> =>
    request({ url: '/catalog/facets', signal }, CatalogFacetsSchema),
};
