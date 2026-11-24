import { useState } from 'react';
import { Link, useCanGoBack, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';

import type { Nft } from '@/contracts';
import { ApiError } from '@/shared/api/api-error';
import { PageError } from '@/shared/ui/page-error';
import { QuantityStepper } from '@/shared/ui/quantity-stepper';

import { defaultEditionId } from '../editions';
import { useNft } from '../queries';
import { Gallery } from './Gallery';
import { MoreFromCollection } from './MoreFromCollection';
import { NftDetailSkeleton } from './NftDetailSkeleton';
import { NftDetailsTabs } from './NftDetailsTabs';
import { NftInfo } from './NftInfo';
import { NotFoundNft } from './NotFoundNft';

function Breadcrumb({ name }: { name: string }) {
  return (
    <nav aria-label="Trilha de navegação" className="hidden md:block">
      <ol className="flex items-center gap-2 text-body-sm font-bold text-foreground">
        <li>
          <Link to="/" className="hover:text-accent">
            Início
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/" hash="catalogo" className="hover:text-accent">
            Mercado
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="truncate font-normal text-secondary">
          {name}
        </li>
      </ol>
    </nav>
  );
}

/** Mobile: volta para onde o usuário estava (catálogo com filtros), ou para o Início. */
function BackButton() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (canGoBack ? router.history.back() : void router.navigate({ to: '/' }))}
      className="grid size-11 place-items-center rounded-full border border-border-soft text-foreground md:hidden"
    >
      <ChevronLeft aria-hidden="true" className="size-5" />
    </button>
  );
}

function LoadedNft({ nft }: { nft: Nft }) {
  const [editionId, setEditionId] = useState(() => defaultEditionId(nft.editions));
  const [quantity, setQuantity] = useState(1);
  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0];
  const available = edition?.available ?? 0;
  // O estoque pode cair depois (tempo real): a quantidade nunca passa do disponível.
  const effectiveQuantity = Math.min(quantity, Math.max(available, 1));

  return (
    <div className="container-page flex flex-col gap-12 py-4 md:py-8 xl:gap-20">
      <title>{`${nft.name} · Kurio`}</title>
      <div className="flex flex-col gap-4">
        <BackButton />
        <Breadcrumb name={nft.name} />
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[572px_minmax(0,1fr)] xl:gap-[33px]">
          <Gallery images={nft.images} name={nft.name} />
          <NftInfo
            nft={nft}
            edition={edition}
            onEditionChange={setEditionId}
            purchase={
              <QuantityStepper
                label="Quantidade"
                value={effectiveQuantity}
                min={1}
                max={Math.max(available, 1)}
                onChange={setQuantity}
                disabled={available === 0}
              />
            }
          />
        </div>
      </div>
      <NftDetailsTabs nft={nft} />
      <MoreFromCollection nft={nft} />
    </div>
  );
}

/** Página de detalhe: skeleton → conteúdo | "NFT não encontrado" | erro com nova tentativa. */
export function NftDetail({ nftId }: { nftId: string }) {
  const { data, error, isPending, isError, refetch } = useNft(nftId);

  if (isPending) {
    return (
      <div className="container-page py-4 md:py-8">
        <title>Carregando NFT · Kurio</title>
        <NftDetailSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container-page py-16">
        {error instanceof ApiError && error.code === 'NOT_FOUND' ? (
          <NotFoundNft />
        ) : (
          <>
            <title>NFT indisponível · Kurio</title>
            <PageError error={error} onRetry={() => void refetch()} title="Não foi possível abrir este NFT" />
          </>
        )}
      </div>
    );
  }

  return <LoadedNft nft={data} />;
}
