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
    <div className="container-page flex flex-col gap-12 py-4 md:py-8 xl:gap-20">
      <title>{`${nft.name} · Kurio`}</title>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between md:hidden">
          <BackButton />
          <FavoriteButton
            item={listItem}
            label="Favoritar"
            className="size-11 border border-border-soft bg-transparent backdrop-blur-none"
          />
        </div>
        <Breadcrumb current={nft.name} />
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[572px_minmax(0,1fr)] xl:gap-[33px]">
          <Gallery images={nft.images} name={nft.name} />
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
