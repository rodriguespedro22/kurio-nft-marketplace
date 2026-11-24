import { useCallback } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';

import { mergeCatalogSearch, type CatalogSearchPatch } from './search';

const homeRoute = getRouteApi('/');

/** Busca validada da Início (fonte única: a URL). */
export const useCatalogSearch = () => homeRoute.useSearch();

type UpdateOptions = {
  /** Digitação da busca substitui a entrada do histórico em vez de criar uma por tecla. */
  replace?: boolean;
};

/**
 * `updateSearch(patch)`: aplica o patch à URL; qualquer chave diferente de `page` zera a página.
 * Não rola a página — o grid continua onde o usuário está.
 */
export function useUpdateCatalogSearch() {
  const navigate = useNavigate({ from: '/' });
  return useCallback(
    (patch: CatalogSearchPatch, { replace = false }: UpdateOptions = {}) => {
      void navigate({ search: (prev) => mergeCatalogSearch(prev, patch), replace, resetScroll: false });
    },
    [navigate],
  );
}
