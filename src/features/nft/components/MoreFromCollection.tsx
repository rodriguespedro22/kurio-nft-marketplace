import { useQuery } from '@tanstack/react-query';

import type { Nft } from '@/contracts';
import { NftRail } from '@/features/catalog/components/NftRail';
import { catalogQueries } from '@/features/catalog/queries';

/** "Mais desta coleção": outros NFTs da mesma coleção (some se não houver nenhum). */
export function MoreFromCollection({ nft }: { nft: Nft }) {
  const { data } = useQuery(catalogQueries.list({ q: nft.collection, page: 1 }));
  const items = (data?.items ?? []).filter(
    (item) => item.id !== nft.id && item.collection === nft.collection,
  );
  return <NftRail id="mais-da-colecao" title="Mais desta coleção" items={items} />;
}
