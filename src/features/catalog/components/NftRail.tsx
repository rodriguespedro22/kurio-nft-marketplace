import type { NftListItem } from '@/contracts';

import { NftCard } from './NftCard';

type NftRailProps = { id: string; title: string; items: NftListItem[] };

/** Faixa de até 5 cards ("Mais desta coleção", "Colecionadores também viram"): rolagem no celular. */
export function NftRail({ id, title, items }: NftRailProps) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <h2 id={id} className="border-b border-border pb-3 text-section font-bold text-accent">
        {title}
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
