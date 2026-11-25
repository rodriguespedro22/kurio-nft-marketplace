import { queryOptions, useQuery } from '@tanstack/react-query';

import { qk } from '@/shared/api/query-keys';
import { fetchNewest } from '@/shared/realtime/fetch-newest';

import { nftApi } from './api';

export const nftQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: qk.nft(id),
      // `nft.updated` grava o detalhe no cache: a resposta de uma busca já em andamento não o faz regredir.
      queryFn: ({ client, queryKey, signal }) => fetchNewest(client, queryKey, () => nftApi.get(id, signal)),
    }),
};

export const useNft = (id: string) => useQuery(nftQueries.detail(id));
