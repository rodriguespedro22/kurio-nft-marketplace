import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, type ErrorComponentProps } from '@tanstack/react-router';

import { catalogQueries } from '@/features/catalog/queries';
import { cmpEth, formatEth } from '@/shared/money/eth';
import { NftImage } from '@/shared/ui/nft-image';
import { PageError } from '@/shared/ui/page-error';

// Provisório: a página de detalhe completa vem a seguir.
export const Route = createFileRoute('/nft/$nftId')({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(catalogQueries.nft(params.nftId)),
  errorComponent: NftError,
  component: NftDetailPage,
});

function NftDetailPage() {
  const { nftId } = Route.useParams();
  const { data: nft } = useSuspenseQuery(catalogQueries.nft(nftId));
  const image = nft.images[0];

  return (
    <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-start">
      <title>{`${nft.name} · Kurio`}</title>
      {image ? (
        <div className="w-full max-w-md overflow-hidden rounded-art bg-surface p-5">
          <NftImage
            asset={image.asset}
            alt={image.alt}
            priority
            sizes="(min-width: 768px) 408px, 100vw"
            className="rounded-art"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        <h1 className="text-h1 font-bold text-foreground">{nft.name}</h1>
        <p className="text-title font-bold text-accent">
          {formatEth(
            nft.editions.reduce(
              (min, e) => (cmpEth(e.price, min) < 0 ? e.price : min),
              nft.editions[0]?.price ?? '0',
            ),
          )}
        </p>
        <p className="max-w-prose text-body-sm text-secondary">{nft.summary}</p>
      </div>
    </div>
  );
}

function NftError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="container-page flex flex-col items-center gap-4 py-16">
      <title>NFT indisponível · Kurio</title>
      <PageError error={error} onRetry={reset} title="Não foi possível abrir este NFT" className="w-full" />
      <Link to="/" className="text-body-sm font-bold text-accent hover:underline">
        Voltar para o Início
      </Link>
    </div>
  );
}
