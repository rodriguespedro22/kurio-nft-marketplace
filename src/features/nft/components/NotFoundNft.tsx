import { Link } from '@tanstack/react-router';
import { ImageOff } from 'lucide-react';

import { buttonVariants } from '@/shared/ui/button-variants';
import { EmptyState } from '@/shared/ui/empty-state';

/** 404 "lógico" da SPA: título próprio e `noindex` para buscadores. */
export function NotFoundNft() {
  return (
    <>
      <title>NFT não encontrado · Kurio</title>
      <meta name="robots" content="noindex" />
      <EmptyState
        titleAs="h1"
        icon={<ImageOff className="size-6" strokeWidth={1.5} />}
        title="NFT não encontrado"
        description="Ele pode ter sido removido do catálogo ou o link está incorreto."
        action={
          <Link to="/" hash="catalogo" className={buttonVariants()}>
            Ver o catálogo
          </Link>
        }
      />
    </>
  );
}
