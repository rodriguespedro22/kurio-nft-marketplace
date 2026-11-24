import { authHandlers } from './auth';
import { cartHandlers } from './cart';
import { controlHandlers } from './control';
import { favoriteHandlers } from './favorites';
import { nftHandlers } from './nfts';

export const handlers = [
  ...controlHandlers,
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
];
