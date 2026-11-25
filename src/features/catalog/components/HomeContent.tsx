import { CatalogSearchBar, CatalogSection } from './CatalogSection';
import { Hero } from './Hero';
import { MintDiary, Promos } from './HomeEditorial';

/** Conteúdo da Início. Também fica, inerte, atrás do modal de Login/Cadastro no desktop. */
export function HomeContent() {
  return (
    <div className="container-page flex flex-col gap-4 py-6 md:gap-10 xl:gap-24 xl:pt-8 xl:pb-0">
      <CatalogSearchBar />
      <Hero />
      <CatalogSection />
      <Promos />
      <MintDiary />
    </div>
  );
}
