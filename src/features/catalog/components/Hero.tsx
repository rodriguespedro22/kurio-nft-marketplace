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
  const nextSlide = SLIDES[(active + 1) % SLIDES.length] ?? SLIDES[0];

  return (
    <section
      aria-labelledby="hero-title"
      className="relative grid grid-cols-[1fr_auto] items-center gap-2 overflow-hidden rounded-[30px] bg-linear-to-br from-surface-dark via-surface to-surface p-4 sm:p-6 xl:h-[450px] xl:grid-cols-[600px_450px] xl:justify-between xl:gap-0 xl:rounded-none xl:bg-none xl:p-0 xl:pl-10"
    >
      {/* Layout: coluna de 600 px centrada na altura; os pontos ficam nela, à direita, 44 px abaixo do botão. */}
      <div className="flex flex-col items-start gap-3 xl:gap-11">
        <div className="flex flex-col items-start gap-0 sm:gap-3 xl:gap-8">
          <div className="flex flex-col gap-1.5 sm:gap-3 xl:gap-1">
            <div className="flex flex-col gap-1.5 sm:gap-3 xl:gap-2">
              <p className="text-[0.75rem] leading-4 font-medium text-foreground sm:text-caption xl:text-body-sm xl:leading-4 xl:tracking-brand">
                Bem-vindo à Kurio
              </p>
              <h1
                id="hero-title"
                className="text-section leading-[29px] font-bold uppercase sm:text-h2 sm:leading-tight xl:text-display xl:leading-[70px]"
              >
                <span className="xl:hidden">Seja dono da cultura digital</span>
                <span className="hidden xl:inline">
                  Seja dono do futuro
                  <br /> da arte digital
                </span>
              </h1>
            </div>
            <p className="max-w-lg text-[0.75rem] leading-[18px] text-secondary sm:text-body-sm xl:max-w-[557px] xl:leading-6">
              <span className="xl:hidden">Descubra NFTs selecionados de criadores do mundo todo.</span>
              <span className="hidden xl:inline">
                Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara,
                apoie artistas e tenha uma parte da cultura da internet.
              </span>
            </p>
          </div>
          <Link
            from="/"
            to="/"
            search={(prev) => prev}
            hash="catalogo"
            className={cn(
              'inline-flex items-center gap-2 text-[0.75rem] leading-[14px] font-bold text-accent uppercase sm:text-body-sm',
              'xl:h-10 xl:w-[140px] xl:rounded-[6px] xl:bg-primary xl:pr-9 xl:pl-7 xl:text-body-lg xl:leading-5 xl:text-ink xl:hover:bg-primary-dark',
            )}
          >
            Explorar
            <ArrowRight aria-hidden="true" className="size-4 xl:hidden" />
          </Link>
        </div>
        <SlideDots active={active} onSelect={setActive} className="hidden xl:flex xl:self-end" />
      </div>

      <div className="relative size-[138px] sm:size-44 xl:size-[450px]">
        <div className="size-full overflow-hidden rounded-2xl xl:rounded-3xl">
          <NftImage
            key={slide.asset}
            asset={slide.asset}
            alt={slide.alt}
            priority
            sizes="(min-width: 1280px) 450px, (min-width: 640px) 176px, 138px"
            className="animate-in duration-300 fade-in-0"
          />
        </div>
        {/* Frame mobile: miniatura da próxima arte sobre o canto inferior esquerdo. */}
        <div className="absolute top-[88px] left-3.5 size-[58px] overflow-hidden rounded-2xl sm:hidden">
          <NftImage asset={nextSlide.asset} alt="" sizes="58px" />
        </div>
      </div>

      <SlideDots active={active} onSelect={setActive} className="col-span-2 justify-center xl:hidden" />
    </section>
  );
}

type SlideDotsProps = { active: number; onSelect: (index: number) => void; className?: string };

/** Pontos do destaque (8 px, 8 px entre eles, todos na cor primária como no layout; o atual vai no `aria-pressed`). */
function SlideDots({ active, onSelect, className }: SlideDotsProps) {
  return (
    <div role="group" aria-label="Artes do destaque" className={cn('flex', className)}>
      {SLIDES.map((s, index) => (
        <button
          key={s.asset}
          type="button"
          aria-label={`Mostrar arte ${index + 1} de ${SLIDES.length}`}
          aria-pressed={index === active}
          onClick={() => onSelect(index)}
          className="-m-1 grid size-4 place-items-center rounded-full p-1 first:ml-0 [&+&]:ml-1"
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
        </button>
      ))}
    </div>
  );
}
