import { useId } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import type { CatalogSearch } from '@/contracts';
import { NftImage } from '@/shared/ui/nft-image';

type Promo = {
  title: string;
  text: string;
  asset: string;
  alt: string;
  search: Partial<CatalogSearch>;
};

/** Os "Explorar" levam ao catálogo já filtrado (edição limitada / arte digital). */
const PROMOS: Promo[] = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    asset: 'ape-emerald-b',
    alt: 'Macaco de óculos escuros e jaqueta verde',
    search: { edition: 'limited' },
  },
  {
    title: 'Arte digital selecionada e muito mais',
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

function PromoCard({ promo }: { promo: Promo }) {
  const titleId = useId();
  return (
    <article className="grid overflow-hidden rounded-lg bg-surface sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="aspect-[4/3] overflow-hidden sm:aspect-auto sm:h-[250px]">
        <NftImage
          asset={promo.asset}
          alt={promo.alt}
          sizes="(min-width: 1280px) 290px, (min-width: 640px) 45vw, 100vw"
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
        <h3 id={titleId} className="text-body-lg font-bold text-foreground">
          {promo.title}
        </h3>
        <p className="text-body-sm text-secondary">{promo.text}</p>
        <Link
          to="/"
          search={promo.search}
          hash="catalogo"
          aria-describedby={titleId}
          className="mt-1 inline-flex h-10 items-center gap-2 rounded-field bg-primary px-5 text-body-sm font-bold text-ink transition-colors hover:bg-primary-dark"
        >
          Explorar
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </article>
  );
}

export function Promos() {
  return (
    <section aria-label="Destaques da Kurio" className="grid gap-6 lg:grid-cols-2">
      {PROMOS.map((promo) => (
        <PromoCard key={promo.title} promo={promo} />
      ))}
    </section>
  );
}

/** "Diário da Cunhagem" — editorial fora do escopo: os posts levam a "Em breve". */
export function MintDiary() {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 text-center">
        <h2 id={headingId} className="text-h1 font-bold text-foreground">
          Diário da Cunhagem
        </h2>
        <p className="text-body-sm text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title}>
            <BlogCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BlogCard({ post }: { post: (typeof POSTS)[number] }) {
  const titleId = useId();
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg bg-surface">
      <div className="h-48 overflow-hidden">
        <NftImage
          asset={post.asset}
          alt=""
          sizes="(min-width: 1280px) 268px, (min-width: 640px) 45vw, 100vw"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-caption text-secondary">
          {post.date} <span aria-hidden="true">|</span> <span className="sr-only">·</span> {post.reading}
        </p>
        <h3 id={titleId} className="text-body-lg font-bold text-foreground">
          {post.title}
        </h3>
        <p className="text-caption text-secondary">{post.text}</p>
        <Link
          to="/em-breve"
          search={{ secao: 'blog' }}
          aria-describedby={titleId}
          className="mt-auto inline-flex min-h-11 w-fit items-center gap-1 text-caption font-bold text-accent hover:underline"
        >
          Ler mais
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
