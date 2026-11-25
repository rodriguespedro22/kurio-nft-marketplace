import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link } from '@tanstack/react-router';

import type { NftListItem } from '@/contracts';
import { cn } from '@/shared/lib/utils';
import { formatEth } from '@/shared/money/eth';
import { NftImage } from '@/shared/ui/nft-image';

type NftRailProps = { id: string; title: string; items: NftListItem[] };

const MAX_ITEMS = 15;

function RailCard({ nft }: { nft: NftListItem }) {
  return (
    <article className="relative flex flex-col gap-3">
      <div className="flex h-[200px] items-center bg-surface p-1 md:h-[255px]">
        <NftImage
          asset={nft.image.asset}
          alt={nft.image.alt}
          sizes="(min-width: 1280px) 212px, (min-width: 768px) 30vw, 46vw"
          className="rounded-[13px]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="truncate text-body leading-5 text-foreground">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary focus-visible:after:outline-solid"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="text-body-lg leading-4 font-bold text-accent">
          <span className="sr-only">Preço: </span>
          {formatEth(nft.price)}
          {nft.status === 'sold_out' ? <span className="font-normal text-muted"> · Esgotado</span> : null}
        </p>
      </div>
    </article>
  );
}

/** Páginas da faixa a partir da geometria da rolagem (a quantidade por página muda com a largura). */
function usePages(scroller: RefObject<HTMLUListElement | null>, itemCount: number) {
  const [pages, setPages] = useState({ count: 1, active: 0 });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth === 0) return;
      const count = Math.max(1, Math.ceil((el.scrollWidth - 4) / el.clientWidth));
      const maxScroll = el.scrollWidth - el.clientWidth;
      const active =
        maxScroll <= 0 ? 0 : Math.min(count - 1, Math.round((el.scrollLeft / maxScroll) * (count - 1)));
      setPages((prev) => (prev.count === count && prev.active === active ? prev : { count, active }));
    };
    // O ResizeObserver já mede uma vez ao começar a observar.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [scroller, itemCount]);

  return pages;
}

/**
 * Faixa de cards ("Mais desta coleção", "Colecionadores também viram"): cinco por vez no desktop,
 * rolagem horizontal e pontos de página.
 */
export function NftRail({ id, title, items }: NftRailProps) {
  const scroller = useRef<HTMLUListElement>(null);
  const visible = items.slice(0, MAX_ITEMS);
  const pages = usePages(scroller, visible.length);

  function goTo(page: number) {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollTo({
      left: (maxScroll * page) / Math.max(1, pages.count - 1),
      behavior: reduce ? 'auto' : 'smooth',
    });
  }

  if (visible.length === 0) return null;

  return (
    <section aria-labelledby={id} className="flex flex-col gap-8">
      <h2
        id={id}
        className="border-b border-primary/30 pb-3 text-[1.0625rem] leading-4 font-bold text-accent"
      >
        {title}
      </h2>
      <div className="flex flex-col gap-8">
        <ul
          ref={scroller}
          className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto px-4 md:mx-0 md:gap-7 md:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {visible.map((item) => (
            <li
              key={item.id}
              className="w-[46%] shrink-0 snap-start md:w-[calc((100%-3.5rem)/3)] xl:w-[calc((100%-7rem)/5)]"
            >
              <RailCard nft={item} />
            </li>
          ))}
        </ul>
        {pages.count > 1 ? (
          <div role="group" aria-label={`Páginas de ${title}`} className="flex justify-center gap-2">
            {Array.from({ length: pages.count }, (_, page) => (
              <button
                key={page}
                type="button"
                aria-label={`Página ${page + 1} de ${pages.count}`}
                aria-current={page === pages.active || undefined}
                onClick={() => goTo(page)}
                className={cn(
                  'relative size-3 rounded-full border-[1.3px] border-primary transition-colors before:absolute before:-inset-1 hover:bg-primary/40',
                  page === pages.active && 'bg-primary',
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
