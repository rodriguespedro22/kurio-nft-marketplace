import {
  CatalogFacetsSchema,
  CategoryListSchema,
  FeaturedNftsSchema,
  NftPageSchema,
  NftSchema,
  type CatalogFacets,
  type CatalogSearch,
  type Category,
  type Nft,
  type NftListItem,
  type Paginated,
} from '@/contracts';
import { request } from '@/shared/api/client';

export const catalogApi = {
  list: (params: CatalogSearch, signal?: AbortSignal): Promise<Paginated<NftListItem>> =>
    request({ url: '/nfts', params, signal }, NftPageSchema),

  featured: (signal?: AbortSignal): Promise<NftListItem[]> =>
    request({ url: '/nfts/featured', signal }, FeaturedNftsSchema),

  nft: (id: string, signal?: AbortSignal): Promise<Nft> =>
    request({ url: `/nfts/${encodeURIComponent(id)}`, signal }, NftSchema),

  categories: (signal?: AbortSignal): Promise<Category[]> =>
    request({ url: '/categories', signal }, CategoryListSchema),

  facets: (signal?: AbortSignal): Promise<CatalogFacets> =>
    request({ url: '/catalog/facets', signal }, CatalogFacetsSchema),
};
