import { Link } from '@tanstack/react-router';
import { Heart } from 'lucide-react';

import { NftGrid, NftGridSkeleton } from '@/features/catalog/components/NftGrid';
import { buttonVariants } from '@/shared/ui/button-variants';
import { EmptyState } from '@/shared/ui/empty-state';
import { PageError } from '@/shared/ui/page-error';

import { useFavorites } from '../queries';

/** Lista de interesse do usuário: skeleton → grade | vazio | erro com nova tentativa. */
export function FavoritesPage() {
  const { data, error, isPending, isError, refetch } = useFavorites();

  return (
    <section className="container-page flex flex-col gap-8 py-8 xl:py-12">
      <title>Favoritos · Kurio</title>
      <h1 className="text-title-sm font-bold text-foreground md:text-h1">Favoritos</h1>
      {isPending ? (
        <NftGridSkeleton count={6} />
      ) : isError ? (
        <PageError error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-6" />}
          title="Nenhum favorito ainda"
          description="Toque no coração de um NFT para guardá-lo aqui."
          action={
            <Link to="/" hash="catalogo" className={buttonVariants({ variant: 'primary' })}>
              Explorar o catálogo
            </Link>
          }
        />
      ) : (
        <NftGrid items={data.items} label="NFTs favoritos" />
      )}
    </section>
  );
}
