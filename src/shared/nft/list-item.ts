import type { Nft, NftListItem } from '@/contracts';
import { cmpEth } from '@/shared/money/eth';

type PricedEdition = { price: string; available: number };

/** Preço de vitrine: menor preço entre as edições disponíveis (esgotado → menor preço geral). */
export function displayPriceOf(editions: readonly PricedEdition[]): string {
  const available = editions.filter((e) => e.available > 0);
  const pool = available.length > 0 ? available : editions;
  return pool.reduce((min, e) => (cmpEth(e.price, min) < 0 ? e.price : min), pool[0]?.price ?? '0');
}

export const displayPrice = (nft: Nft): string => displayPriceOf(nft.editions);

/** Projeção de lista (card) de um NFT completo — usada pelo mock e pela atualização otimista. */
export function toListItem(nft: Nft): NftListItem {
  const { id, name, tokenNumber, collection, category, network, isRare, previousPrice, status, version } =
    nft;
  const image = nft.images[0] ?? { asset: 'ape-emerald-a', alt: nft.name };
  return {
    id,
    name,
    tokenNumber,
    collection,
    category,
    network,
    isRare,
    previousPrice,
    status,
    version,
    image,
    price: displayPrice(nft),
  };
}
