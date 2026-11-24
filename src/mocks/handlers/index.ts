import { authHandlers } from './auth';
import { cartHandlers } from './cart';
import { controlHandlers } from './control';
import { favoriteHandlers } from './favorites';
import { nftHandlers } from './nfts';
import { quoteHandlers } from './quotes';

export const handlers = [
  ...controlHandlers,
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
];
