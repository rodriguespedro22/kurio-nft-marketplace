import { useId } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import type { CatalogSearch } from '@/contracts';
import { NftImage } from '@/shared/ui/nft-image';
import { InertLink } from '@/shared/ui/inert-link';

type Promo = {
  /** Duas linhas, com a quebra do layout. */
  title: readonly [string, string];
  text: string;
  asset: string;
  alt: string;
  search: Partial<CatalogSearch>;
};

/** Os "Explorar" levam ao catálogo já filtrado (edição limitada / arte digital). */
const PROMOS: Promo[] = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    asset: 'ape-emerald-b',
    alt: 'Macaco de óculos escuros e jaqueta verde',
    search: { edition: 'limited' },
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    asset: 'ape-ivory-a',
    alt: 'Gorila de blazer creme e gola alta verde',
    search: { category: ['arte-digital'] },
  },
];

const POSTS = [
  {
    date: '12 de setembro',
    reading: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    asset: 'ape-ivory-b',
  },
  {
    date: '13 de setembro',
    reading: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    asset: 'ape-emerald-c',
  },
  {
    date: '15 de setembro',
    reading: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    asset: 'ape-violet-b',
  },
  {
    date: '15 de setembro',
    reading: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    asset: 'ape-golden-b',
  },
] as const;

/** Card de 586 × 250: arte de 292 px à esquerda (raio 18, com dois arcos decorativos) e texto alinhado à direita. */
function PromoCard({ promo }: { promo: Promo }) {
  const titleId = useId();
  return (
    <article className="grid overflow-hidden rounded-lg bg-surface sm:h-[250px] sm:grid-cols-[292px_minmax(0,1fr)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] sm:aspect-auto sm:h-[250px]">
        <NftImage
          asset={promo.asset}
          alt={promo.alt}
          sizes="(min-width: 640px) 292px, 100vw"
          className="h-full"
        />
        <span
          aria-hidden="true"
          className="absolute top-[142px] -left-[186px] size-64 rounded-full border-2 border-primary"
        />
        <span
          aria-hidden="true"
          className="absolute top-[134px] -left-[194px] size-64 rounded-full border border-primary"
        />
      </div>
      <div className="flex flex-col items-end gap-[9px] p-6 text-right sm:pt-[37px] sm:pr-[30px] sm:pb-[46px] sm:pl-0">
        <h3 id={titleId} className="text-section leading-6 font-bold text-foreground">
          {promo.title[0]}
          <br />
          {promo.title[1]}
        </h3>
        <p className="max-w-[263px] text-body-sm leading-6 text-secondary sm:line-clamp-3">{promo.text}</p>
        <Link
          to="/"
          search={promo.search}
          hash="catalogo"
          aria-describedby={titleId}
          className="mt-auto inline-flex h-10 w-[140px] shrink-0 items-center justify-center rounded-[6px] bg-primary text-body-sm leading-5 font-medium text-ink transition-colors hover:bg-primary-dark"
        >
          Explorar
          <ArrowRight aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
        </Link>
      </div>
    </article>
  );
}

export function Promos() {
  return (
    <section aria-label="Destaques da Kurio" className="grid gap-6 lg:grid-cols-2 xl:gap-7">
      {PROMOS.map((promo) => (
        <PromoCard key={promo.title.join(' ')} promo={promo} />
      ))}
    </section>
  );
}

/** "Diário da Cunhagem" — editorial fora do escopo: os posts levam a "Em breve". */
export function MintDiary() {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8 xl:gap-10">
      <header className="flex flex-col gap-3 text-center">
        <h2 id={headingId} className="text-h1 leading-[37px] font-bold text-foreground">
          Diário da Cunhagem
        </h2>
        <p className="text-body-sm leading-[18px] text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-[repeat(4,268px)]">
        {POSTS.map((post) => (
          <li key={post.title}>
            <BlogCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Card de 268 × 369 do layout: imagem de 195 px e texto de 12/16 px. */
function BlogCard({ post }: { post: (typeof POSTS)[number] }) {
  const titleId = useId();
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg bg-surface xl:h-[369px]">
      <div className="h-48 shrink-0 overflow-hidden xl:h-[195px]">
        <NftImage
          asset={post.asset}
          alt=""
          sizes="(min-width: 1280px) 268px, (min-width: 640px) 45vw, 100vw"
          className="h-full"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
        <p className="text-[0.75rem] leading-4 font-medium text-secondary">
          {post.date}
          <span aria-hidden="true">&nbsp; | &nbsp;</span>
          <span className="sr-only">, </span>
          {post.reading}
        </p>
        <h3 id={titleId} className="text-body-lg leading-[21px] font-bold text-foreground">
          {post.title}
        </h3>
        <p className="text-[0.75rem] leading-4 font-medium text-secondary">{post.text}</p>
        <InertLink className="inline-flex w-fit items-center gap-1 text-[0.75rem] leading-4 font-bold text-accent">
          Ler mais
          <span aria-hidden="true" className="font-normal">
            →
          </span>
        </InertLink>
      </div>
    </article>
  );
}
