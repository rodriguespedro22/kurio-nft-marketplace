import { z } from 'zod';

import { EthSchema, IsoDateTimeSchema, NetworkSchema } from './common';

/**
 * `GET /explorer/tx/:hash` — transação simulada de um pedido confirmado. É pública como num
 * explorador de verdade, por isso não leva usuário, carteira nem itens: só o que a rede registraria.
 */
export const TransactionSchema = z.object({
  hash: z.string(),
  status: z.literal('confirmed'),
  network: NetworkSchema,
  blockNumber: z.number().int().positive(),
  timestamp: IsoDateTimeSchema,
  tokens: z.number().int().positive(),
  value: EthSchema,
  networkFee: EthSchema,
});
export type Transaction = z.infer<typeof TransactionSchema>;
