import type { Edition } from '@/contracts';
import { cmpEth } from '@/shared/money/eth';

/** Edição pré-selecionada: a mais barata com estoque (empate: a primeira na ordem 1/1 → Aberta). */
export function defaultEditionId(editions: readonly Edition[]): string {
  const available = editions.filter((e) => e.available > 0);
  const pool = available.length > 0 ? available : editions;
  let best: Edition | undefined;
  for (const edition of pool) if (!best || cmpEth(edition.price, best.price) < 0) best = edition;
  return best?.id ?? '';
}
