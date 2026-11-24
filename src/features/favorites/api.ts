import {
  FavoritesSchema,
  FavoriteToggleResponseSchema,
  type FavoriteToggleResponse,
  type Favorites,
} from '@/contracts';
import { request } from '@/shared/api/client';

const path = (nftId: string) => `/favorites/${encodeURIComponent(nftId)}`;

export const favoritesApi = {
  list: (signal?: AbortSignal): Promise<Favorites> => request({ url: '/favorites', signal }, FavoritesSchema),

  add: (nftId: string): Promise<FavoriteToggleResponse> =>
    request({ url: path(nftId), method: 'PUT' }, FavoriteToggleResponseSchema),

  remove: (nftId: string): Promise<FavoriteToggleResponse> =>
    request({ url: path(nftId), method: 'DELETE' }, FavoriteToggleResponseSchema),
};
