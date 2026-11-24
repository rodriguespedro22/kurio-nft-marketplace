import { queryOptions, useQuery } from '@tanstack/react-query';

import { qk } from '@/shared/api/query-keys';

import { nftApi } from './api';

export const nftQueries = {
  detail: (id: string) =>
    queryOptions({ queryKey: qk.nft(id), queryFn: ({ signal }) => nftApi.get(id, signal) }),
};

export const useNft = (id: string) => useQuery(nftQueries.detail(id));
