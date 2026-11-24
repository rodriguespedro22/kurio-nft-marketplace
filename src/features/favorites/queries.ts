import { queryOptions, useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { Favorites, NftListItem } from '@/contracts';
import { useSession } from '@/features/auth/session';
import { qk } from '@/shared/api/query-keys';
import { announce } from '@/shared/ui/announce';

import { favoritesApi } from './api';
import { applyFavorite } from './optimistic';

export const FAVORITES_ERROR = 'Não foi possível atualizar favoritos';
const TOGGLE_KEY = ['favorites', 'toggle'] as const;

export const favoritesQueries = {
  list: (userId: string) =>
    queryOptions({
      queryKey: qk.user(userId).favorites,
      queryFn: ({ signal }) => favoritesApi.list(signal),
    }),
};

/** Favoritos do usuário logado (desligado para visitantes). */
export function useFavorites() {
  const userId = useSession()?.user.id;
  return useQuery({ ...favoritesQueries.list(userId ?? ''), enabled: Boolean(userId) });
}

type ToggleVariables = { item: NftListItem; favorited: boolean };
type ToggleContext = { key: readonly unknown[]; applied: boolean; wasFavorited: boolean; index: number };

const toggleKey = (userId: string, nftId: string) => [...TOGGLE_KEY, userId, nftId] as const;

/**
 * `true` quando o NFT está nos favoritos. Um toggle ainda em voo vale mais que a lista: o botão
 * responde na hora mesmo se a lista não carregou, e volta sozinho se o pedido falhar.
 */
export function useIsFavorite(nftId: string): boolean {
  const userId = useSession()?.user.id ?? '';
  const { data } = useQuery({
    ...favoritesQueries.list(userId),
    enabled: Boolean(userId),
    select: (list: Favorites) => list.items.some((i) => i.id === nftId),
  });
  const pending = useMutationState({
    filters: { mutationKey: toggleKey(userId, nftId), status: 'pending' },
    select: (mutation) => (mutation.state.variables as ToggleVariables | undefined)?.favorited,
  });
  return pending.at(-1) ?? data ?? false;
}

/**
 * Favoritar/desfavoritar com atualização otimista. Uma fila por NFT (`scope`): cliques rápidos
 * chegam ao servidor na ordem. Com a lista em cache: cancela leituras em voo, guarda a posição e
 * aplica; o rollback desfaz só este NFT (toggles de outros NFTs não são apagados por um snapshot
 * antigo). Sem lista ainda, a carga inicial não é cancelada — o botão usa o toggle pendente.
 * A revalidação espera a última mutação de favoritos terminar.
 */
export function useToggleFavorite(nftId: string) {
  const queryClient = useQueryClient();
  const userId = useSession()?.user.id ?? '';

  return useMutation<unknown, Error, ToggleVariables, ToggleContext | undefined>({
    mutationKey: toggleKey(userId, nftId),
    scope: { id: `favorites:${nftId}` },
    mutationFn: ({ item, favorited }) =>
      favorited ? favoritesApi.add(item.id) : favoritesApi.remove(item.id),
    onMutate: async ({ item, favorited }) => {
      if (!userId) return undefined;
      const key = qk.user(userId).favorites;
      if (!queryClient.getQueryData<Favorites>(key)) {
        return { key, applied: false, wasFavorited: false, index: 0 };
      }
      await queryClient.cancelQueries({ queryKey: key });
      const items = queryClient.getQueryData<Favorites>(key)?.items ?? [];
      const index = items.findIndex((i) => i.id === item.id);
      queryClient.setQueryData<Favorites>(key, (old) => applyFavorite(old, item, favorited));
      return { key, applied: true, wasFavorited: index >= 0, index: Math.max(index, 0) };
    },
    onSuccess: (_data, { item, favorited }, context) => {
      // Confirmado: garante o estado mesmo se uma leitura antiga chegou depois do clique.
      if (context && queryClient.getQueryData(context.key)) {
        queryClient.setQueryData<Favorites>(context.key, (old) => applyFavorite(old, item, favorited));
      }
    },
    onError: (_error, { item }, context) => {
      // Cache removido no meio do caminho (logout/troca de usuário): nada a desfazer.
      if (context?.applied && queryClient.getQueryData(context.key)) {
        queryClient.setQueryData<Favorites>(context.key, (old) =>
          applyFavorite(old, item, context.wasFavorited, context.index),
        );
      }
      announce(FAVORITES_ERROR, 'assertive');
      toast.error(FAVORITES_ERROR);
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context && queryClient.isMutating({ mutationKey: TOGGLE_KEY }) === 1) {
        void queryClient.invalidateQueries({ queryKey: context.key });
      }
    },
  });
}
