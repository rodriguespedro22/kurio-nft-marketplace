import type { Favorites, NftListItem } from '@/contracts';

/**
 * Aplica (ou desfaz) um favorito na lista em cache. `index` devolve o item à posição em que
 * estava — o rollback não reordena a página de favoritos. Lista ainda não carregada fica como está:
 * o `invalidate` do fim da mutação traz o estado do servidor.
 */
export function applyFavorite(
  list: Favorites | undefined,
  item: NftListItem,
  favorited: boolean,
  index = 0,
): Favorites | undefined {
  if (!list) return list;
  const rest = list.items.filter((i) => i.id !== item.id);
  if (!favorited) return { items: rest };
  const at = Math.min(Math.max(index, 0), rest.length);
  return { items: [...rest.slice(0, at), item, ...rest.slice(at)] };
}
