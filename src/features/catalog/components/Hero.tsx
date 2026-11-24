import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { NftImage } from '@/shared/ui/nft-image';

/** Artes estáticas (não dependem da API): a arte do hero é o LCP da página. */
const SLIDES = [
  { asset: 'ape-emerald-a', alt: 'Macaco de óculos escuros e jaqueta universitária verde' },
  { asset: 'ape-violet-a', alt: 'Gorila de chapéu bucket e moletom lilás' },
  { asset: 'ape-golden-a', alt: 'Orangotango de fones de ouvido verdes e jaqueta creme' },
] as const;

export function Hero() {
  const [active, setActive] = useState(0);
  const slide = SLIDES[active] ?? SLIDES[0];

  return (
    <section
      aria-labelledby="hero-title"
      className="relative grid grid-cols-[1fr_auto] items-center gap-4 overflow-hidden rounded-3xl bg-linear-to-br from-surface-dark via-surface to-surface p-4 sm:p-6 xl:h-[450px] xl:grid-cols-[1fr_450px] xl:gap-12 xl:rounded-none xl:bg-none xl:p-0"
    >
      <div className="flex flex-col items-start gap-3 xl:gap-5 xl:pl-10">
        <p className="text-caption font-medium tracking-brand text-foreground xl:text-body-sm">
          Bem-vindo à Kurio
        </p>
        <h1
          id="hero-title"
          className="text-title-sm font-bold uppercase sm:text-h2 xl:max-w-xl xl:text-display"
        >
          <span className="xl:hidden">Seja dono da cultura digital</span>
          <span className="hidden xl:inline">Seja dono do futuro da arte digital</span>
        </h1>
        <p className="max-w-lg text-caption text-secondary sm:text-body-sm">
          <span className="xl:hidden">Descubra NFTs selecionados de criadores do mundo todo.</span>
          <span className="hidden xl:inline">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara,
            apoie artistas e tenha uma parte da cultura da internet.
          </span>
        </p>
        <Link
          from="/"
          to="/"
          search={(prev) => prev}
          hash="catalogo"
          className={cn(
            'inline-flex items-center gap-2 text-body-sm font-bold text-accent uppercase xl:mt-2',
            'xl:h-10 xl:rounded-control xl:bg-primary xl:px-5 xl:text-ink xl:hover:bg-primary-dark',
          )}
        >
          Explorar
          <ArrowRight aria-hidden="true" className="size-4 xl:hidden" />
        </Link>
      </div>

      <div className="size-32 overflow-hidden rounded-2xl sm:size-44 xl:size-[450px] xl:rounded-3xl">
        <NftImage
          key={slide.asset}
          asset={slide.asset}
          alt={slide.alt}
          priority
          sizes="(min-width: 1280px) 450px, (min-width: 640px) 176px, 128px"
          className="animate-in duration-300 fade-in-0"
        />
      </div>

      <div
        role="group"
        aria-label="Artes do destaque"
        className="col-span-2 flex justify-center gap-1 xl:absolute xl:bottom-8 xl:left-[calc(50%-90px)] xl:col-span-1"
      >
        {SLIDES.map((s, index) => (
          <button
            key={s.asset}
            type="button"
            aria-label={`Mostrar arte ${index + 1} de ${SLIDES.length}`}
            aria-pressed={index === active}
            onClick={() => setActive(index)}
            className="grid size-6 place-items-center rounded-full"
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-2 rounded-full bg-primary transition-opacity',
                index === active ? 'opacity-100' : 'opacity-40',
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
