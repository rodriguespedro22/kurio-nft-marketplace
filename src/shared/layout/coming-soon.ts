/**
 * Seções fora do escopo do desafio. Todas levam a `/em-breve?secao=<chave>` — um estado
 * coerente que nunca simula sucesso. Só chaves conhecidas: a página não ecoa texto da URL.
 */
export const COMING_SOON_SECTIONS = {
  criadores: 'Criadores',
  aprenda: 'Aprenda',
  escanear: 'Escanear NFT',
  blog: 'Diário da Cunhagem',
  colecao: 'Minha coleção',
  atividade: 'Atividade',
  estudio: 'Estúdio do criador',
  ajuda: 'Central de ajuda',
  'como-comprar': 'Como comprar NFTs',
  seguranca: 'Carteira e segurança',
  politica: 'Política do mercado',
  denunciar: 'Denunciar item',
  'redes-sociais': 'Redes sociais',
  'recuperar-senha': 'Recuperação de senha',
  ofertas: 'Ofertas',
  arquivos: 'Arquivos baixados',
  suporte: 'Suporte',
} as const;

export type ComingSoonSection = keyof typeof COMING_SOON_SECTIONS;

export const COMING_SOON_KEYS = Object.keys(COMING_SOON_SECTIONS) as [
  ComingSoonSection,
  ...ComingSoonSection[],
];
