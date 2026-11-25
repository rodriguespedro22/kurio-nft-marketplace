import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import { HomeContent } from '@/features/catalog/components/HomeContent';
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
    <>
      <title>Kurio · Marketplace de NFTs</title>
      <HomeContent />
    </>
  );
}
