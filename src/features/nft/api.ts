import { NftSchema, type Nft } from '@/contracts';
import { request } from '@/shared/api/client';

export const nftApi = {
  get: (id: string, signal?: AbortSignal): Promise<Nft> =>
    request({ url: `/nfts/${encodeURIComponent(id)}`, signal }, NftSchema),
};
