import { z } from 'zod';

import { CatalogSearchSchema, type CatalogSearch } from '@/contracts';

const s = CatalogSearchSchema.shape;

const emptyToUndefined = <T>(value: T | undefined): T | undefined => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;
  return value;
};

const dedupe = <T>(list: T[] | undefined) => (list ? [...new Set(list)] : list);

/**
 * Busca do catálogo como vive na URL. Cada chave inválida vira `undefined` (e `page` volta a 1)
 * em vez de quebrar a rota: um link antigo ou editado à mão ainda abre o catálogo.
 */
export const catalogSearchSchema = z.object({
  q: s.q.transform(emptyToUndefined).catch(undefined),
  category: s.category.transform((v) => emptyToUndefined(dedupe(v))).catch(undefined),
  network: s.network.transform((v) => emptyToUndefined(dedupe(v))).catch(undefined),
  edition: s.edition.catch(undefined),
  minPrice: s.minPrice.catch(undefined),
  maxPrice: s.maxPrice.catch(undefined),
  tab: s.tab.catch(undefined),
  sort: s.sort.catch(undefined),
  page: s.page.catch(1),
});

export type CatalogSearchState = z.output<typeof catalogSearchSchema>;
export type CatalogSearchPatch = Partial<CatalogSearchState>;

type FilterKey = Exclude<keyof CatalogSearchState, 'page'>;
const FILTER_KEYS: readonly FilterKey[] = [
  'q',
  'category',
  'network',
  'edition',
  'minPrice',
  'maxPrice',
  'tab',
  'sort',
];

/** Remove chaves vazias (texto em branco, lista vazia, `undefined`); `q` sai aparado. */
function clean(search: CatalogSearchPatch): CatalogSearchState {
  const out: Record<string, unknown> = {};
  for (const key of FILTER_KEYS) {
    const raw = search[key];
    const value = typeof raw === 'string' ? raw.trim() : raw;
    const kept = emptyToUndefined(value);
    if (kept !== undefined) out[key] = kept;
  }
  out.page = search.page && search.page >= 1 ? search.page : 1;
  return out as CatalogSearchState;
}

/**
 * Aplica um patch à busca atual. Mudar qualquer filtro (tudo exceto `page`) volta para a
 * página 1 — a página 3 de um resultado não existe necessariamente no próximo.
 */
export function mergeCatalogSearch(prev: CatalogSearchPatch, patch: CatalogSearchPatch): CatalogSearchState {
  const before = clean(prev);
  const after = clean({ ...prev, ...patch });
  const filtersChanged = FILTER_KEYS.some(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
  return filtersChanged ? { ...after, page: 1 } : after;
}

/** Parâmetros do `GET /nfts` a partir da busca da URL (sem chaves vazias). */
export function toCatalogParams(search: CatalogSearchPatch): CatalogSearch {
  return clean(search);
}

export function hasActiveFilters(search: CatalogSearchPatch): boolean {
  const cleaned = clean(search);
  return (['q', 'category', 'network', 'edition', 'minPrice', 'maxPrice'] as const).some(
    (key) => cleaned[key] !== undefined,
  );
}

/** id do campo de busca da Início — o ícone de busca do header aponta para `/#busca`. */
export const SEARCH_INPUT_ID = 'busca';
