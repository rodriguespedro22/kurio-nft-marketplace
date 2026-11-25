import { useCallback } from 'react';
import { useMatch, useNavigate } from '@tanstack/react-router';

import { catalogSearchSchema, mergeCatalogSearch, type CatalogSearchPatch } from './search';

/** Catálogo sem filtros: o que aparece atrás do modal de Login/Cadastro no desktop. */
const DEFAULT_SEARCH = catalogSearchSchema.parse({});

/** Busca validada da Início (fonte única: a URL); fora da Início, o catálogo padrão. */
export const useCatalogSearch = () =>
  useMatch({ from: '/', shouldThrow: false, select: (match) => match.search }) ?? DEFAULT_SEARCH;

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
