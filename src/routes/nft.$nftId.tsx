import { createFileRoute } from '@tanstack/react-router';

import { NftDetail } from '@/features/nft/components/NftDetail';
import { nftQueries } from '@/features/nft/queries';

export const Route = createFileRoute('/nft/$nftId')({
  // Celular: compra em barra fixa embaixo (layout), no lugar da navegação inferior.
  staticData: { phoneBottomBar: true },
  // Não bloqueia a navegação: o skeleton aparece na hora e o preload por intenção adianta os dados.
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(nftQueries.detail(params.nftId));
  },
  component: NftDetailPage,
});

function NftDetailPage() {
  const { nftId } = Route.useParams();
  // `key`: trocar de NFT (ex.: "Mais desta coleção") recomeça edição e quantidade.
  return <NftDetail key={nftId} nftId={nftId} />;
}
