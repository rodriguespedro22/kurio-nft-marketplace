export type PageSlot = number | 'gap';

const MAX_SLOTS = 7;

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Botões da paginação: sempre no máximo 7 posições (primeira, vizinhas da atual, última). */
export function pageWindow(current: number, total: number): PageSlot[] {
  if (total <= 0) return [];
  if (total <= MAX_SLOTS) return range(1, total);
  const page = Math.min(Math.max(current, 1), total);
  if (page <= 4) return [...range(1, 5), 'gap', total];
  if (page >= total - 3) return [1, 'gap', ...range(total - 4, total)];
  return [1, 'gap', page - 1, page, page + 1, 'gap', total];
}
