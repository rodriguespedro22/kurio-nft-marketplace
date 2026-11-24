import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

// Placeholder do shell: hero e catálogo vêm a seguir.
function HomePage() {
  return (
    <div className="container-page flex flex-col gap-10 py-10">
      <title>Kurio · Marketplace de NFTs</title>
      <section aria-labelledby="hero-title" className="flex flex-col gap-4">
        <p className="text-body-sm font-medium tracking-brand text-foreground">Bem-vindo à Kurio</p>
        <h1 id="hero-title" className="max-w-xl text-h1 font-bold uppercase xl:text-display">
          Seja dono do futuro da arte digital
        </h1>
        <p className="max-w-lg text-body-sm text-secondary">
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie
          artistas e tenha uma parte da cultura da internet.
        </p>
      </section>
      <section id="catalogo" aria-label="Catálogo" className="min-h-40 scroll-mt-24" />
    </div>
  );
}
