import { z } from 'zod';

import { IdSchema } from './common';
import { NftListItemSchema } from './nft';

/** `GET /favorites` */
export const FavoritesSchema = z.object({
  items: z.array(NftListItemSchema),
});
export type Favorites = z.infer<typeof FavoritesSchema>;

/** `PUT /favorites/:nftId` e `DELETE /favorites/:nftId` */
export const FavoriteToggleResponseSchema = z.object({
  nftId: IdSchema,
  favorited: z.boolean(),
});
export type FavoriteToggleResponse = z.infer<typeof FavoriteToggleResponseSchema>;
