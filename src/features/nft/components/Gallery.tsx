import { useId, useRef, useState, type KeyboardEvent } from 'react';

import type { NftImage as NftImageData } from '@/contracts';
import { cn } from '@/shared/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';
import { SearchIcon } from '@/shared/ui/icons';
import { NftImage } from '@/shared/ui/nft-image';

type GalleryProps = { images: NftImageData[]; name: string };

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp']);

/**
 * Galeria: miniaturas como abas (setas, Home/End) controlando a arte principal; lupa abre a
 * arte ampliada num diálogo.
 */
export function Gallery({ images, name }: GalleryProps) {
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId();
  const panelId = `${baseId}-arte`;
  const total = images.length;
  const current = images[active] ?? images[0];

  function select(index: number, focus: boolean) {
    setActive(index);
    if (focus) tabs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null;
    if (NEXT_KEYS.has(event.key)) next = (active + 1) % total;
    else if (PREV_KEYS.has(event.key)) next = (active - 1 + total) % total;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = total - 1;
    if (next === null) return;
    event.preventDefault();
    select(next, true);
  }

  if (!current) return null;

  return (
    <div className="flex flex-col gap-4 md:flex-row-reverse md:items-start md:gap-7">
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${baseId}-tab-${active}`}
        className="relative min-w-0 flex-1 rounded-lg bg-surface p-3 md:p-5"
      >
        <div data-testid="nft-main-image" className="overflow-hidden rounded-art">
          <NftImage
            key={current.asset}
            asset={current.asset}
            alt={current.alt}
            priority
            sizes="(min-width: 1280px) 404px, (min-width: 768px) 45vw, 100vw"
            className="animate-in duration-200 fade-in-0"
          />
        </div>
        <Dialog>
          <DialogTrigger
            aria-label="Ampliar imagem"
            className="absolute top-5 right-5 grid size-11 place-items-center rounded-full bg-ink/80 text-foreground transition-colors hover:text-accent md:top-7 md:right-7"
          >
            <SearchIcon aria-hidden="true" className="size-5" />
          </DialogTrigger>
          <DialogContent className="max-w-[min(92vw,900px)] p-3 sm:p-4">
            <DialogTitle className="sr-only">{name} — imagem ampliada</DialogTitle>
            <div className="overflow-hidden rounded-art">
              <NftImage asset={current.asset} alt={current.alt} sizes="(min-width: 960px) 900px, 92vw" />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {total > 1 ? (
        <div
          role="tablist"
          aria-label="Imagens do NFT"
          onKeyDown={handleKeyDown}
          className="flex gap-3 md:flex-col md:gap-4"
        >
          {images.map((image, index) => (
            <button
              key={image.asset}
              ref={(el) => {
                tabs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${index}`}
              aria-selected={index === active}
              aria-controls={panelId}
              aria-label={`Imagem ${index + 1} de ${total}`}
              tabIndex={index === active ? 0 : -1}
              onClick={() => select(index, false)}
              className={cn(
                'size-18 overflow-hidden rounded-lg border-2 border-transparent opacity-70 transition md:size-25',
                'hover:opacity-100 aria-selected:border-primary aria-selected:opacity-100',
              )}
            >
              <NftImage asset={image.asset} alt="" sizes="100px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
