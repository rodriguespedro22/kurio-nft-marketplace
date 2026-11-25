import { TransactionSchema, type Transaction } from '@/contracts';
import { request } from '@/shared/api/client';

export const explorerApi = {
  /** `GET /explorer/tx/:hash` — público, como um explorador de blocos. */
  transaction: (hash: string, signal?: AbortSignal): Promise<Transaction> =>
    request({ url: `/explorer/tx/${encodeURIComponent(hash)}`, signal }, TransactionSchema),
};
