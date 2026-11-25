import { useMemo, useState } from 'react';

import type { Nft } from '@/contracts';
import { FavoriteButton } from '@/features/favorites/components/FavoriteButton';
import { ApiError } from '@/shared/api/api-error';
import { BackButton } from '@/shared/layout/BackButton';
import { Breadcrumb } from '@/shared/layout/Breadcrumb';
import { toListItem } from '@/shared/nft/list-item';
import { PageError } from '@/shared/ui/page-error';

import { defaultEditionId } from '../editions';
import { useNft } from '../queries';
import { Gallery } from './Gallery';
import { MoreFromCollection } from './MoreFromCollection';
import { NftDetailSkeleton } from './NftDetailSkeleton';
import { NftDetailsTabs } from './NftDetailsTabs';
import { NftInfo } from './NftInfo';
import { NotFoundNft } from './NotFoundNft';
import { PurchasePanel } from './PurchasePanel';

function LoadedNft({ nft }: { nft: Nft }) {
  const [editionId, setEditionId] = useState(() => defaultEditionId(nft.editions));
  const [quantity, setQuantity] = useState(1);
  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0];
  const available = edition?.available ?? 0;
  // O estoque pode cair depois (tempo real): a quantidade nunca passa do disponível.
  const effectiveQuantity = Math.min(quantity, Math.max(available, 1));
  const listItem = useMemo(() => toListItem(nft), [nft]);

  return (
    <div className="container-page flex flex-col gap-12 pb-4 md:gap-16 md:pt-8 md:pb-6 xl:gap-24">
      <title>{`${nft.name} · Kurio`}</title>
      <div className="flex flex-col gap-3">
        <Breadcrumb current={nft.name} hideCurrent />
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8 xl:grid-cols-[573px_minmax(0,1fr)]">
          {/* Celular: arte sobre o degradê, com Voltar e Favoritar no topo (como no layout mobile). */}
          <div className="flex flex-col gap-2 max-md:-mx-4 max-md:bg-linear-[135deg] max-md:from-surface max-md:to-surface-raised max-md:px-7 max-md:pt-6">
            <div className="flex items-center justify-between md:hidden">
              <BackButton className="size-[35px] border-border bg-surface-raised text-secondary" />
              <FavoriteButton
                item={listItem}
                label="Favoritar"
                className="size-[35px] border border-border bg-surface-raised text-accent backdrop-blur-none hover:bg-surface-raised [&_svg]:size-4"
              />
            </div>
            <Gallery images={nft.images} name={nft.name} />
          </div>
          <div className="max-md:relative max-md:z-10 max-md:-mx-4 max-md:-mt-[30px] max-md:rounded-t-[31px] max-md:bg-surface max-md:px-6 max-md:pt-8 max-md:pb-8">
            <NftInfo
              nft={nft}
              edition={edition}
              onEditionChange={setEditionId}
              purchase={
                <PurchasePanel
                  nft={nft}
                  listItem={listItem}
                  edition={edition}
                  quantity={effectiveQuantity}
                  onQuantityChange={setQuantity}
                />
              }
            />
          </div>
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
