import { http, HttpResponse } from 'msw';

import type { FavoriteToggleResponse, Favorites, NftListItem } from '@/contracts';
import { toListItem } from '@/shared/nft/list-item';

import { db } from '../db/store';
import { withNetwork } from '../network/with-network';
import { apiError, apiPath } from './http';
import { authenticate } from './session';

/** Favoritos do usuário, mais recente primeiro; ids de NFTs que saíram do catálogo são ignorados. */
function listFavorites(userId: string): Favorites {
  const { nfts, favorites } = db.get();
  const items = (favorites[userId] ?? [])
    .map((id) => nfts.find((n) => n.id === id))
    .filter((nft) => nft !== undefined)
    .map(toListItem) satisfies NftListItem[];
  return { items };
}

function toggle(request: Request, nftId: string, favorited: boolean): Response {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  if (!db.get().nfts.some((n) => n.id === nftId)) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.');

  db.update((d) => {
    const current = (d.favorites[auth.user.id] ?? []).filter((id) => id !== nftId);
    d.favorites[auth.user.id] = favorited ? [nftId, ...current] : current;
  });
  const body: FavoriteToggleResponse = { nftId, favorited };
  return HttpResponse.json(body);
}

export const favoriteHandlers = [
  http.get(
    apiPath('/favorites'),
    withNetwork(({ request }) => {
      const auth = authenticate(request);
      if (auth instanceof Response) return auth;
      return HttpResponse.json(listFavorites(auth.user.id));
    }),
  ),

  // PUT/DELETE idempotentes: favoritar duas vezes não duplica, desfavoritar o que não está é ok.
  http.put(
    apiPath('/favorites/:nftId'),
    withNetwork(({ request, params }) => toggle(request, String(params.nftId), true)),
  ),
  http.delete(
    apiPath('/favorites/:nftId'),
    withNetwork(({ request, params }) => toggle(request, String(params.nftId), false)),
  ),
];
