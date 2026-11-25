import { authHandlers } from './auth';
import { cartHandlers } from './cart';
import { controlHandlers } from './control';
import { favoriteHandlers } from './favorites';
import { nftHandlers } from './nfts';
import { orderHandlers } from './orders';
import { profileHandlers } from './profile';
import { socketHandlers } from '../socket/server';
import { quoteHandlers } from './quotes';
import { walletHandlers } from './wallets';

export const handlers = [
  ...controlHandlers,
  ...authHandlers,
  ...nftHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...walletHandlers,
  ...profileHandlers,
  ...socketHandlers,
];
