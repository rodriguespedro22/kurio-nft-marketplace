import { NETWORK_LABELS, NETWORKS, type Edition, type Network, type Nft, type NftImage } from '@/contracts';
import { mulEth, type Eth } from '@/shared/money/eth';

import { createPrng, type Prng } from '../db/prng';
import { CATEGORY_DEFINITIONS, type CategoryId } from './categories';

// 60 NFTs determinísticos: os 9 nomes do layout + 51 gerados com PRNG semeado.
// Datas fixas (sem Date.now()), preços de lista entre 0.39 e 12.5 ETH.

type Art = 'emerald' | 'violet' | 'ivory' | 'golden';
type Variant = 'a' | 'b' | 'c';
type EditionCode = '1/1' | '1/10' | '1/50' | 'open';

const ARTS: readonly Art[] = ['emerald', 'violet', 'ivory', 'golden'];
const VARIANTS: readonly Variant[] = ['a', 'b', 'c'];

const ART_INFO: Record<Art, { collection: string; alt: string; attributes: [string, string] }> = {
  emerald: {
    collection: 'Kurio Apes',
    alt: 'Macaco de óculos escuros e jaqueta verde-esmeralda',
    attributes: ['Óculos', 'Esmeralda'],
  },
  violet: {
    collection: 'Nomad Society',
    alt: 'Macaco de chapéu e moletom violeta',
    attributes: ['Chapéu', 'Violeta'],
  },
  ivory: { collection: 'Ivory Court', alt: 'Macaco de blazer marfim', attributes: ['Blazer', 'Marfim'] },
  golden: {
    collection: 'Golden Frequencies',
    alt: 'Macaco com fones de ouvido dourados',
    attributes: ['Fones', 'Dourado'],
  },
};

const VARIANT_ALT: Record<Variant, string> = { a: '', b: ' (versão espelhada)', c: ' (detalhe)' };

const EDITION_SPEC: Record<
  EditionCode,
  { label: string; kind: Edition['kind']; supply: number | null; multiplier: number }
> = {
  '1/1': { label: '1/1', kind: 'single', supply: 1, multiplier: 4 },
  '1/10': { label: '1/10', kind: 'limited', supply: 10, multiplier: 2 },
  '1/50': { label: '1/50', kind: 'limited', supply: 50, multiplier: 1 },
  open: { label: 'Aberta', kind: 'open', supply: null, multiplier: 1 },
};
const EDITION_ORDER: readonly EditionCode[] = ['1/1', '1/10', '1/50', 'open'];
const EDITION_SLUG: Record<EditionCode, string> = {
  '1/1': '1-1',
  '1/10': '1-10',
  '1/50': '1-50',
  open: 'aberta',
};

const CREATORS = [
  'Nova Sato',
  'Lia Moraes',
  'Theo Okafor',
  'Mira Koenig',
  'Rui Tanaka',
  'Ayla Nunes',
] as const;
const RIGHTS =
  'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.';

const DAY_MS = 24 * 60 * 60 * 1000;
const NEWEST_LISTING = Date.UTC(2026, 10, 20, 15, 0, 0);
const listedAt = (daysAgo: number) => new Date(NEWEST_LISTING - daysAgo * DAY_MS).toISOString();

type NftSpec = {
  id?: string;
  name: string;
  art: Art;
  variant: Variant;
  base: Eth;
  editions: readonly EditionCode[];
  category: CategoryId;
  network: Network;
  creator: string;
  isRare?: boolean;
  previousPrice?: Eth;
  rating?: { average: number; count: number };
  /** Preço por edição quando difere de `base × multiplicador`. */
  prices?: Partial<Record<EditionCode, Eth>>;
  /** Disponível por edição quando difere do sorteio. */
  available?: Partial<Record<EditionCode, number>>;
  soldOut?: boolean;
  extraAttribute?: string;
  /** Popularidade fixa: o mais popular é o "NFT em destaque" do layout. */
  trendingScore?: number;
};

/** Grade do Início no layout, na ordem exibida ("Listados recentemente"). */
const LAYOUT_NFTS: readonly NftSpec[] = [
  {
    name: 'Emerald Ape #042',
    art: 'emerald',
    variant: 'a',
    base: '1.19',
    editions: ['1/1', '1/10', '1/50', 'open'],
    prices: { '1/1': '4.76', '1/10': '2.38', '1/50': '1.19', open: '1.19' },
    available: { '1/1': 1, '1/10': 6, '1/50': 32, open: 500 },
    category: 'arte-digital',
    network: 'ethereum',
    creator: 'Nova Sato',
    // No layout o card não leva a etiqueta RARO; "Raro" fica só entre os atributos do detalhe.
    rating: { average: 4.8, count: 19 },
    extraAttribute: 'Raro',
  },
  {
    name: 'Sage Nomad #009',
    art: 'violet',
    variant: 'b',
    base: '1.69',
    editions: ['1/10', '1/50'],
    category: 'generativa',
    network: 'polygon',
    creator: 'Lia Moraes',
  },
  {
    name: 'Neon Vessel #552',
    art: 'ivory',
    variant: 'b',
    base: '1.99',
    previousPrice: '2.29',
    editions: ['1/50', 'open'],
    category: 'arte-3d',
    network: 'solana',
    creator: 'Theo Okafor',
    isRare: true,
    extraAttribute: 'Raro',
  },
  {
    name: 'Cosmic Bloom #118',
    art: 'violet',
    variant: 'c',
    base: '1.29',
    editions: ['1/1', '1/10'],
    prices: { '1/1': '5.16', '1/10': '1.29' },
    category: 'fotografia',
    network: 'ethereum',
    creator: 'Mira Koenig',
  },
  {
    name: 'Violet Nomad #314',
    art: 'violet',
    variant: 'a',
    base: '1.39',
    editions: ['1/10', '1/50', 'open'],
    prices: { '1/10': '2.78', '1/50': '1.39', open: '1.39' },
    available: { '1/10': 8, '1/50': 40, open: 500 },
    category: 'colecionaveis',
    network: 'polygon',
    creator: 'Lia Moraes',
    trendingScore: 1001,
  },
  {
    id: 'nft-ivory-baron-088',
    name: 'Ivory Baron #088',
    art: 'ivory',
    variant: 'a',
    base: '1.79',
    editions: ['1/10', '1/50', 'open'],
    prices: { '1/10': '3.58', '1/50': '1.79', open: '1.79' },
    available: { '1/10': 5, '1/50': 40, open: 500 },
    category: 'arte-digital',
    network: 'ethereum',
    creator: 'Rui Tanaka',
  },
  {
    name: 'Golden Beat #207',
    art: 'golden',
    variant: 'a',
    base: '0.99',
    // Caso misto exigido: edição 1/1 esgotada, 1/50 disponível.
    editions: ['1/1', '1/50'],
    available: { '1/1': 0, '1/50': 18 },
    category: 'musica',
    network: 'ethereum',
    creator: 'Ayla Nunes',
  },
  {
    name: 'Golden Frequency #071',
    art: 'golden',
    variant: 'c',
    base: '0.59',
    editions: ['open'],
    category: 'musica',
    network: 'polygon',
    creator: 'Ayla Nunes',
  },
  {
    name: 'Golden Signal #160',
    art: 'golden',
    variant: 'b',
    base: '0.39',
    editions: ['1/50', 'open'],
    category: 'jogos',
    network: 'solana',
    creator: 'Theo Okafor',
  },
];

const ADJECTIVES = [
  'Amber',
  'Cobalt',
  'Crimson',
  'Lunar',
  'Solar',
  'Velvet',
  'Copper',
  'Azure',
  'Obsidian',
  'Saffron',
  'Mint',
  'Coral',
  'Onyx',
  'Pearl',
  'Rust',
  'Indigo',
  'Silver',
  'Jade',
  'Scarlet',
  'Opal',
] as const;
const NOUNS = [
  'Drift',
  'Echo',
  'Pulse',
  'Voyager',
  'Monarch',
  'Rebel',
  'Oracle',
  'Ranger',
  'Dreamer',
  'Wanderer',
  'Sentinel',
  'Mystic',
  'Cipher',
  'Pilot',
  'Rider',
  'Seeker',
  'Herald',
  'Ghost',
  'Nomad',
  'Baron',
] as const;
const PRICE_POOL: readonly Eth[] = [
  '0.45',
  '0.52',
  '0.68',
  '0.74',
  '0.85',
  '0.92',
  '1.05',
  '1.12',
  '1.24',
  '1.35',
  '1.48',
  '1.56',
  '1.65',
  '1.88',
  '2.05',
  '2.2',
  '2.45',
  '2.6',
  '2.85',
  '3.1',
  '3.4',
  '3.75',
  '4.2',
  '4.6',
  '5.1',
  '5.8',
  '6.4',
  '7.25',
  '8.1',
  '9.3',
  '10.4',
  '11.2',
];
const EDITION_PATTERNS: readonly (readonly EditionCode[])[] = [
  ['open'],
  ['1/50', 'open'],
  ['1/10', '1/50'],
  ['1/1', '1/10'],
  ['1/10', '1/50', 'open'],
  ['1/1', '1/50', 'open'],
  ['1/1'],
];
/** Índices (entre os gerados) que nascem totalmente esgotados. */
const SOLD_OUT_INDEXES = new Set([4, 17, 33]);
const GENERATED_COUNT = 51;

const pad = (n: number, size: number) => String(n).padStart(size, '0');
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/#/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function hexAddress(prng: Prng): string {
  return `0x${Array.from({ length: 40 }, () => '0123456789abcdef'[prng.int(0, 15)]).join('')}`;
}

function base58Address(prng: Prng): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  return Array.from({ length: 44 }, () => alphabet[prng.int(0, alphabet.length - 1)]).join('');
}

function images(name: string, art: Art, variant: Variant): NftImage[] {
  const order = [variant, ...VARIANTS.filter((v) => v !== variant)];
  return order.map((v) => ({
    asset: `ape-${art}-${v}`,
    alt: `${name} — ${ART_INFO[art].alt}${VARIANT_ALT[v]}`,
  }));
}

function buildNft(spec: NftSpec, daysAgo: number, prng: Prng): Nft {
  const id = spec.id ?? `nft-${slugify(spec.name)}`;
  const token = pad(Number(spec.name.split('#')[1] ?? 0), 4);
  const { collection, attributes } = ART_INFO[spec.art];
  const networkLabel = NETWORK_LABELS[spec.network];

  const chosen = EDITION_ORDER.filter((code) => spec.editions.includes(code));
  // A edição mais barata carrega o preço base (= preço de lista); as raras escalam a partir dela.
  const minMultiplier = Math.min(...chosen.map((code) => EDITION_SPEC[code].multiplier));

  const editions: Edition[] = chosen.map((code) => {
    const { label, kind, supply } = EDITION_SPEC[code];
    const multiplier = EDITION_SPEC[code].multiplier / minMultiplier;
    const drawn =
      code === '1/1' ? 1 : code === 'open' ? 500 : prng.int(Math.ceil((supply ?? 10) / 5), supply ?? 10);
    return {
      id: `${id}-${EDITION_SLUG[code]}`,
      label,
      kind,
      price: spec.prices?.[code] ?? mulEth(spec.base, multiplier),
      supply,
      available: spec.soldOut ? 0 : (spec.available?.[code] ?? drawn),
    };
  });

  return {
    id,
    name: spec.name,
    tokenNumber: token,
    collection,
    creator: spec.creator,
    category: spec.category,
    network: spec.network,
    images: images(spec.name, spec.art, spec.variant),
    summary: `Um colecionável digital finalizado à mão da coleção ${collection}, verificado na ${networkLabel}, com arte desbloqueável e acesso para colecionadores.`,
    description:
      `${spec.name} é uma obra digital finalizada à mão da coleção ${collection}. Cada atributo fica armazenado nos metadados do token e verificado na ${networkLabel}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.\n\n` +
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${spec.creator} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    attributes: spec.extraAttribute ? [...attributes, spec.extraAttribute] : [...attributes],
    rating: spec.rating ?? { average: Math.round((4 + prng.next()) * 10) / 10, count: prng.int(3, 60) },
    contractAddress: spec.network === 'solana' ? base58Address(prng) : hexAddress(prng),
    rights: RIGHTS,
    isRare: spec.isRare ?? false,
    previousPrice: spec.previousPrice ?? null,
    editions,
    status: editions.every((e) => e.available === 0) ? 'sold_out' : 'listed',
    listedAt: listedAt(daysAgo),
    // O sorteio acontece sempre, para não deslocar a sequência dos NFTs seguintes.
    trendingScore: ((score) => spec.trendingScore ?? score)(prng.int(10, 1000)),
    version: 1,
  };
}

function generatedSpecs(prng: Prng): NftSpec[] {
  const usedNames = new Set(LAYOUT_NFTS.map((s) => s.name.split(' #')[0]));
  const usedTokens = new Set(LAYOUT_NFTS.map((s) => Number(s.name.split('#')[1])));
  const specs: NftSpec[] = [];

  for (let i = 0; i < GENERATED_COUNT; i++) {
    let title: string;
    do title = `${prng.pick(ADJECTIVES)} ${prng.pick(NOUNS)}`;
    while (usedNames.has(title));
    usedNames.add(title);

    let token: number;
    do token = prng.int(1, 999);
    while (usedTokens.has(token));
    usedTokens.add(token);

    const art = ARTS[i % ARTS.length] as Art;
    specs.push({
      name: `${title} #${pad(token, 3)}`,
      art,
      variant: VARIANTS[Math.floor(i / ARTS.length) % VARIANTS.length] as Variant,
      // O primeiro gerado fixa o teto da faixa de preço.
      base: i === 0 ? '12.5' : prng.pick(PRICE_POOL),
      editions: prng.pick(EDITION_PATTERNS),
      category: CATEGORY_DEFINITIONS[i % CATEGORY_DEFINITIONS.length]?.id ?? 'arte-digital',
      network: prng.pick(NETWORKS),
      creator: prng.pick(CREATORS),
      isRare: prng.chance(0.15),
      previousPrice: undefined,
      soldOut: SOLD_OUT_INDEXES.has(i),
    });
  }
  return specs;
}

export function buildSeedNfts(seed = 20261124): Nft[] {
  const prng = createPrng(seed);
  const specs = [...LAYOUT_NFTS, ...generatedSpecs(prng)];
  return specs.map((spec, index) => buildNft(spec, index, prng));
}

export const SEED_NFTS: readonly Nft[] = buildSeedNfts();
