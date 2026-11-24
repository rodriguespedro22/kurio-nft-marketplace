import type { QueryClient, QueryKey } from '@tanstack/react-query';

import type { Cart, Nft, NftListItem, NftUpdatedEvent } from '@/contracts';
import { qk } from '@/shared/api/query-keys';
import { displayPriceOf } from '@/shared/nft/list-item';

type ItemList = { items: NftListItem[] };

const isPrivate = (key: QueryKey, kinds: readonly string[]) =>
  (key[0] === 'user' || key[0] === 'guest') && typeof key[2] === 'string' && kinds.includes(key[2]);

/** Troca, nas listas, o item do NFT do evento — só se o evento for mais novo que o item. */
function patchItems(items: NftListItem[], event: NftUpdatedEvent): NftListItem[] {
  let changed = false;
  const next = items.map((item) => {
    if (item.id !== event.resource.id || event.version <= item.version) return item;
    changed = true;
    return {
      ...item,
      price: displayPriceOf(event.data.editions),
      status: event.data.status,
      version: event.version,
    };
  });
  return changed ? next : items;
}

/**
 * Aplica `nft.updated` ao cache (ARCHITECTURE.md §8), nunca regredindo: detalhe e itens de lista só mudam
 * se `event.version` > versão em cache (o gate não conhece o que veio do REST). Carrinho e
 * cotação são recalculados pelo servidor: invalidados quando o NFT está no carrinho.
 */
export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent): void {
  const nftId = event.resource.id;
  const updates = new Map(event.data.editions.map((e) => [e.id, e]));

  queryClient.setQueryData<Nft>(qk.nft(nftId), (nft) => {
    if (!nft || event.version <= nft.version) return nft;
    return {
      ...nft,
      status: event.data.status,
      version: event.version,
      editions: nft.editions.map((edition) => {
        const update = updates.get(edition.id);
        return update ? { ...edition, price: update.price, available: update.available } : edition;
      }),
    };
  });

  const patchPage = (page: ItemList | undefined) => {
    if (!page) return page;
    const items = patchItems(page.items, event);
    return items === page.items ? page : { ...page, items };
  };
  queryClient.setQueriesData<ItemList>({ queryKey: ['catalog'] }, patchPage);
  queryClient.setQueriesData<ItemList>({ predicate: (q) => isPrivate(q.queryKey, ['favorites']) }, patchPage);
  queryClient.setQueriesData<NftListItem[]>({ queryKey: qk.featured() }, (list) =>
    list ? patchItems(list, event) : list,
  );

  const carts = queryClient.getQueriesData<Cart>({ predicate: (q) => isPrivate(q.queryKey, ['cart']) });
  if (carts.some(([, cart]) => cart?.items.some((item) => item.nftId === nftId))) {
    void queryClient.invalidateQueries({ predicate: (q) => isPrivate(q.queryKey, ['cart', 'quote']) });
  }
}
