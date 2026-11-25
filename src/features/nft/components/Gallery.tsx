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
 * Galeria: as abas trocam a arte principal (setas, Home/End). No desktop são miniaturas em coluna;
 * no celular, os pontos sobre a arte. A lupa (no celular, a própria arte) abre a arte ampliada.
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
    <div className="relative flex flex-col md:flex-row-reverse md:items-start md:gap-7">
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${baseId}-tab-${active}`}
        className="relative min-w-0 flex-1 md:rounded-[6px] md:bg-surface md:p-4 xl:max-w-[444px]"
      >
        <div data-testid="nft-main-image" className="overflow-hidden rounded-3xl">
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
            className={cn(
              // Celular: a arte inteira é o gatilho (o layout mobile não desenha a lupa).
              'absolute inset-0 rounded-3xl',
              'md:inset-auto md:top-[13px] md:right-3 md:grid md:size-[30px] md:place-items-center md:rounded-full md:border md:border-border md:bg-surface-raised md:text-foreground md:transition-colors md:hover:text-accent',
            )}
          >
            <SearchIcon aria-hidden="true" className="hidden size-5 md:block" />
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
          className="absolute bottom-[50px] left-1/2 z-10 flex -translate-x-1/2 items-center md:static md:translate-x-0 md:flex-col md:gap-4"
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
                // Celular: ponto de 7 px (o ativo vira pílula de 28 px) dentro de uma área de toque de 24 px.
                'grid h-6 min-w-6 shrink-0 place-items-center rounded-full before:h-[7px] before:w-[7px] before:rounded-full before:bg-primary before:transition-[width] aria-selected:before:w-7',
                // Desktop: miniatura de 100 px sobre o fundo `surface`.
                'md:block md:size-25 md:overflow-hidden md:rounded-lg md:border md:border-transparent md:bg-surface md:transition-colors md:before:hidden md:hover:border-border-soft md:aria-selected:w-25 md:aria-selected:border-primary',
              )}
            >
              <NftImage asset={image.asset} alt="" sizes="100px" className="hidden md:block" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
