import { useQuery } from '@tanstack/react-query';

import type { Nft } from '@/contracts';
import { NftCard } from '@/features/catalog/components/NftCard';
import { catalogQueries } from '@/features/catalog/queries';

/** "Mais desta coleção": outros NFTs da mesma coleção (some se não houver nenhum). */
export function MoreFromCollection({ nft }: { nft: Nft }) {
  const { data } = useQuery(catalogQueries.list({ q: nft.collection, page: 1 }));
  const items = (data?.items ?? []).filter(
    (item) => item.id !== nft.id && item.collection === nft.collection,
  );
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="mais-da-colecao" className="flex flex-col gap-6">
      <h2 id="mais-da-colecao" className="border-b border-border pb-3 text-section font-bold text-accent">
        Mais desta coleção
      </h2>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:px-0 xl:grid-cols-5 xl:gap-[26px]">
        {items.slice(0, 5).map((item) => (
          <li key={item.id} className="w-[46%] shrink-0 snap-start md:w-auto">
            <NftCard nft={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
