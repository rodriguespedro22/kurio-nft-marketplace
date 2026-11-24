import { z } from 'zod';

import { EthSchema, IdSchema, IsoDateTimeSchema, NetworkSchema, paginated } from './common';

export const CategorySchema = z.object({
  id: IdSchema,
  name: z.string(),
  count: z.number().int().min(0),
});
export type Category = z.infer<typeof CategorySchema>;
export const CategoryListSchema = z.array(CategorySchema);

/** `single` = 1/1, `limited` = 1/10 e 1/50, `open` = Aberta (chips do detalhe). */
export const EditionKindSchema = z.enum(['single', 'limited', 'open']);
export type EditionKind = z.infer<typeof EditionKindSchema>;

export const EditionSchema = z.object({
  id: IdSchema,
  label: z.string(),
  kind: EditionKindSchema,
  price: EthSchema,
  /** `null` para edição aberta (sem limite de tiragem). */
  supply: z.number().int().positive().nullable(),
  available: z.number().int().min(0),
});
export type Edition = z.infer<typeof EditionSchema>;

/** `asset` é o nome-base em `public/images/nfts` (ex.: `ape-emerald-a`); a UI monta o srcset. */
export const NftImageSchema = z.object({
  asset: z.string().min(1),
  alt: z.string(),
});
export type NftImage = z.infer<typeof NftImageSchema>;

export const NftStatusSchema = z.enum(['listed', 'sold_out']);
export type NftStatus = z.infer<typeof NftStatusSchema>;

export const NftSchema = z.object({
  id: IdSchema,
  name: z.string(),
  tokenNumber: z.string(),
  collection: z.string(),
  creator: z.string(),
  category: IdSchema,
  network: NetworkSchema,
  images: z.array(NftImageSchema).min(1),
  /** Texto curto de "Sobre este NFT:". */
  summary: z.string(),
  /** Texto longo da aba "Detalhes do NFT". */
  description: z.string(),
  attributes: z.array(z.string()),
  rating: z.object({ average: z.number().min(0).max(5), count: z.number().int().min(0) }),
  contractAddress: z.string(),
  rights: z.string(),
  isRare: z.boolean(),
  /** Preço anterior riscado no card (opcional no layout). */
  previousPrice: EthSchema.nullable(),
  editions: z.array(EditionSchema).min(1),
  status: NftStatusSchema,
  listedAt: IsoDateTimeSchema,
  trendingScore: z.number(),
  version: z.number().int().min(0),
});
export type Nft = z.infer<typeof NftSchema>;

/** Item de listagem: sem descrição nem galeria; `price` = menor preço entre as edições disponíveis. */
export const NftListItemSchema = NftSchema.pick({
  id: true,
  name: true,
  tokenNumber: true,
  collection: true,
  category: true,
  network: true,
  isRare: true,
  previousPrice: true,
  status: true,
  version: true,
}).extend({
  image: NftImageSchema,
  price: EthSchema,
});
export type NftListItem = z.infer<typeof NftListItemSchema>;

export const NftPageSchema = paginated(NftListItemSchema);
export const FeaturedNftsSchema = z.array(NftListItemSchema);

// ---------- Busca do catálogo (search params da URL) ----------

export const CATALOG_TABS = ['all', 'new', 'trending'] as const;
export const CATALOG_SORTS = ['recent', 'price_asc', 'price_desc', 'name'] as const;

// O router lê `?q=42` como número e `?category=x` como item único: normalizamos aqui.
const urlText = z.preprocess((v) => (typeof v === 'number' ? String(v) : v), z.string().trim().max(80));
const urlEth = z.preprocess((v) => (typeof v === 'number' ? String(v) : v), EthSchema);
const urlList = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (Array.isArray(v) ? v : [v]), z.array(item));

export const CatalogSearchSchema = z.object({
  q: urlText.optional(),
  category: urlList(IdSchema).optional(),
  network: urlList(NetworkSchema).optional(),
  edition: EditionKindSchema.optional(),
  minPrice: urlEth.optional(),
  maxPrice: urlEth.optional(),
  tab: z.enum(CATALOG_TABS).optional(),
  sort: z.enum(CATALOG_SORTS).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type CatalogSearch = z.infer<typeof CatalogSearchSchema>;
