import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import { CatalogSection } from '@/features/catalog/components/CatalogSection';
import { Hero } from '@/features/catalog/components/Hero';
import { MintDiary, Promos } from '@/features/catalog/components/HomeEditorial';
import { catalogQueries } from '@/features/catalog/queries';
import { catalogSearchSchema, toCatalogParams } from '@/features/catalog/search';

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  // `page=1` é o padrão: não polui a URL.
  search: { middlewares: [stripSearchParams({ page: 1 })] },
  loaderDeps: ({ search }) => toCatalogParams(search),
  // Não bloqueia a navegação: só adianta a busca (inclusive no preload por intenção dos links).
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchQuery(catalogQueries.list(deps));
  },
  component: HomePage,
});

function HomePage() {
  return (
    <div className="container-page flex flex-col gap-10 py-6 xl:gap-20 xl:py-10">
      <title>Kurio · Marketplace de NFTs</title>
      <Hero />
      <CatalogSection />
      <Promos />
      <MintDiary />
    </div>
  );
}
