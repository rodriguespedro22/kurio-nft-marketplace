import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import {
  CatalogSearchSchema,
  NETWORK_LABELS,
  NETWORKS,
  type CatalogFacets,
  type CatalogSearch,
  type Nft,
  type NftListItem,
  type Paginated,
} from '@/contracts';
import { cmpEth } from '@/shared/money/eth';
import { displayPrice, toListItem } from '@/shared/nft/list-item';

import { db } from '../db/store';
import { buildCategories } from '../fixtures/categories';
import { withNetwork } from '../network/with-network';
import { apiError, apiPath, validationError } from './http';

export const DEFAULT_PAGE_SIZE = 9;
const MAX_PAGE_SIZE = 48;
/** "Novos lançamentos" e "Em alta" = os N mais recentes / com maior trendingScore. */
export const TAB_SIZE = 24;

const ServerCatalogSchema = CatalogSearchSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

/** Minúsculas, sem acento e sem espaços nas pontas — busca tolerante. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

const byId = (a: Nft, b: Nft) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byRecent = (a: Nft, b: Nft) => b.listedAt.localeCompare(a.listedAt) || byId(a, b);
const byTrending = (a: Nft, b: Nft) => b.trendingScore - a.trendingScore || byId(a, b);

const SORTERS: Record<NonNullable<CatalogSearch['sort']>, (a: Nft, b: Nft) => number> = {
  recent: byRecent,
  price_asc: (a, b) => cmpEth(displayPrice(a), displayPrice(b)) || byId(a, b),
  price_desc: (a, b) => cmpEth(displayPrice(b), displayPrice(a)) || byId(a, b),
  name: (a, b) => a.name.localeCompare(b.name, 'pt-BR') || byId(a, b),
};

/** Filtra, ordena e pagina o catálogo (função pura — base do `GET /nfts`). */
export function queryCatalog(
  nfts: readonly Nft[],
  search: CatalogSearch & { pageSize: number },
): Paginated<NftListItem> {
  let pool = [...nfts];
  if (search.tab === 'new') pool = pool.sort(byRecent).slice(0, TAB_SIZE);
  if (search.tab === 'trending') pool = pool.sort(byTrending).slice(0, TAB_SIZE);

  const q = search.q ? normalizeText(search.q) : '';
  const filtered = pool.filter((nft) => {
    if (q && !normalizeText(`${nft.name} ${nft.collection} ${nft.creator}`).includes(q)) return false;
    if (search.category?.length && !search.category.includes(nft.category)) return false;
    if (search.network?.length && !search.network.includes(nft.network)) return false;
    if (search.edition && !nft.editions.some((e) => e.kind === search.edition)) return false;
    const price = displayPrice(nft);
    if (search.minPrice && cmpEth(price, search.minPrice) < 0) return false;
    if (search.maxPrice && cmpEth(price, search.maxPrice) > 0) return false;
    return true;
  });

  const defaultOrder = search.tab === 'trending' ? byTrending : byRecent;
  filtered.sort(search.sort ? SORTERS[search.sort] : defaultOrder);

  const { page, pageSize } = search;
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize).map(toListItem),
    page,
    pageSize,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / pageSize),
  };
}

/** Lê a query aceitando `category=a&category=b` e `category[]=a`. */
function readSearch(url: URL): Record<string, unknown> {
  const params = url.searchParams;
  const list = (key: string) => {
    const values = [...params.getAll(key), ...params.getAll(`${key}[]`)];
    return values.length ? values : undefined;
  };
  const one = (key: string) => params.get(key) ?? undefined;
  return {
    q: one('q'),
    category: list('category'),
    network: list('network'),
    edition: one('edition'),
    minPrice: one('minPrice'),
    maxPrice: one('maxPrice'),
    tab: one('tab'),
    sort: one('sort'),
    page: one('page'),
    pageSize: one('pageSize'),
  };
}

export const nftHandlers = [
  http.get(
    apiPath('/nfts'),
    withNetwork(
      ({ request }) => {
        const parsed = ServerCatalogSchema.safeParse(readSearch(new URL(request.url)));
        if (!parsed.success) return validationError(parsed.error, 'Parâmetros de busca inválidos.');
        return HttpResponse.json(queryCatalog(db.get().nfts, parsed.data));
      },
      { route: 'nfts' },
    ),
  ),

  // Antes de `/nfts/:id`, senão "featured" seria lido como id.
  http.get(
    apiPath('/nfts/featured'),
    withNetwork(() => HttpResponse.json([...db.get().nfts].sort(byTrending).slice(0, 3).map(toListItem)), {
      route: 'catalog',
    }),
  ),

  http.get(
    apiPath('/nfts/:id'),
    withNetwork(
      ({ params }) => {
        const nft = db.get().nfts.find((n) => n.id === params.id);
        if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.');
        return HttpResponse.json(nft);
      },
      { route: 'catalog' },
    ),
  ),

  http.get(
    apiPath('/catalog/facets'),
    withNetwork(
      () => {
        const nfts = db.get().nfts;
        const networks = NETWORKS.map((id) => ({
          id,
          name: NETWORK_LABELS[id],
          count: nfts.filter((n) => n.network === id).length,
        }));
        const prices = nfts.map(displayPrice).sort(cmpEth);
        const body: CatalogFacets = {
          networks,
          priceRange: prices.length ? { min: prices[0]!, max: prices[prices.length - 1]! } : null,
        };
        return HttpResponse.json(body);
      },
      { route: 'catalog' },
    ),
  ),

  http.get(
    apiPath('/categories'),
    withNetwork(() => HttpResponse.json(buildCategories(db.get().nfts)), { route: 'catalog' }),
  ),
];
