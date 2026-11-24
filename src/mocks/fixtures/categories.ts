import type { Category, Nft } from '@/contracts';

/** Sidebar "Coleções" do layout, nesta ordem. */
export const CATEGORY_DEFINITIONS = [
  { id: 'arte-digital', name: 'Arte digital' },
  { id: 'fotografia', name: 'Fotografia' },
  { id: 'musica', name: 'Música' },
  { id: 'arte-3d', name: 'Arte 3D' },
  { id: 'colecionaveis', name: 'Colecionáveis' },
  { id: 'generativa', name: 'Generativa' },
  { id: 'jogos', name: 'Jogos' },
  { id: 'assinaturas', name: 'Assinaturas' },
  { id: 'utilidade', name: 'Utilidade' },
] as const;

export type CategoryId = (typeof CATEGORY_DEFINITIONS)[number]['id'];

/** Contagens sempre calculadas a partir dos NFTs atuais (nunca fixas). */
export function buildCategories(nfts: readonly Nft[]): Category[] {
  const counts = new Map<string, number>();
  for (const nft of nfts) counts.set(nft.category, (counts.get(nft.category) ?? 0) + 1);
  return CATEGORY_DEFINITIONS.map(({ id, name }) => ({ id, name, count: counts.get(id) ?? 0 }));
}
