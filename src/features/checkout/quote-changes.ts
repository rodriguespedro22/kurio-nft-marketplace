import type { Quote } from '@/contracts';
import { cmpEth, type Eth } from '@/shared/money/eth';

export type QuoteChange = { key: string; label: string; previous: Eth | null; current: Eth | null };

const TOTALS = [
  ['subtotal', 'Subtotal'],
  ['discount', 'Desconto do lançamento'],
  ['networkFee', 'Taxa de rede'],
  ['total', 'Total'],
] as const;

const differs = (a: Eth | null, b: Eth | null) => a === null || b === null || cmpEth(a, b) !== 0;

/**
 * O que mudou entre a cotação que a pessoa viu e a renovada: totais de linha (preço × quantidade),
 * depois os valores do resumo. Id/versão novos sem diferença de valor não contam.
 */
export function quoteChanges(
  previous: Quote,
  current: Quote,
  lineNames: Record<string, string> = {},
): QuoteChange[] {
  const changes: QuoteChange[] = [];
  const ids = new Set([...previous.lines, ...current.lines].map((line) => line.cartItemId));
  for (const id of ids) {
    const before = previous.lines.find((line) => line.cartItemId === id)?.lineTotal ?? null;
    const after = current.lines.find((line) => line.cartItemId === id)?.lineTotal ?? null;
    if (differs(before, after)) {
      changes.push({ key: `line:${id}`, label: lineNames[id] ?? 'Item', previous: before, current: after });
    }
  }
  for (const [field, label] of TOTALS) {
    if (differs(previous[field], current[field])) {
      changes.push({ key: field, label, previous: previous[field], current: current[field] });
    }
  }
  return changes;
}
