import { z } from 'zod';

/** ETH no transporte: string decimal, até 18 casas, sem sinal nem expoente. */
export const ETH_PATTERN = /^\d+(\.\d{1,18})?$/;
export const EthSchema = z.string().regex(ETH_PATTERN, 'Valor em ETH inválido');

export const IdSchema = z.string().min(1);
export const IsoDateTimeSchema = z.iso.datetime();

export const REQUIRED = 'Obrigatório';

// ---------- Redes ----------

export const NETWORKS = ['ethereum', 'polygon', 'solana'] as const;
export const NetworkSchema = z.enum(NETWORKS, { error: 'Selecione uma rede' });
export type Network = z.infer<typeof NetworkSchema>;

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
};

export const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
export const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const ENS_PATTERN = /^[a-z0-9-]+\.eth$/;

/** Ethereum e Polygon usam endereço EVM (0x…); Solana usa base58 de 32–44 caracteres. */
export function isValidAddress(network: Network, address: string): boolean {
  return network === 'solana' ? SOLANA_ADDRESS_PATTERN.test(address) : EVM_ADDRESS_PATTERN.test(address);
}

export const INVALID_ADDRESS = 'Endereço inválido para a rede selecionada';
export const INVALID_ENS_OR_ADDRESS = 'Informe um ENS ou endereço válido';

// ---------- Campos de formulário compartilhados (app e mock validam igual) ----------

export const EmailSchema = z
  .string(REQUIRED)
  .trim()
  .toLowerCase()
  .min(1, REQUIRED)
  .pipe(z.email('E-mail inválido'));

export const UsernameSchema = z
  .string(REQUIRED)
  .trim()
  .min(1, REQUIRED)
  .min(3, 'Use pelo menos 3 caracteres')
  .max(24, 'Use no máximo 24 caracteres')
  .regex(/^[a-zA-Z0-9_.]+$/, 'Use apenas letras, números, "_" ou "."');

export const DisplayNameSchema = z
  .string(REQUIRED)
  .trim()
  .min(1, REQUIRED)
  .min(2, 'Use pelo menos 2 caracteres')
  .max(40, 'Use no máximo 40 caracteres');

export const ProfileNameSchema = DisplayNameSchema;

export const WalletLabelSchema = z
  .string(REQUIRED)
  .trim()
  .min(1, REQUIRED)
  .min(2, 'Use pelo menos 2 caracteres')
  .max(32, 'Use no máximo 32 caracteres');

export const EnsNameSchema = z
  .string(REQUIRED)
  .trim()
  .toLowerCase()
  .min(1, REQUIRED)
  .regex(ENS_PATTERN, 'Use um nome ENS válido, ex.: colecionador.eth');

export const ReferralCodeSchema = z
  .string(REQUIRED)
  .trim()
  .min(1, REQUIRED)
  .regex(/^[A-Za-z0-9-]{4,20}$/, 'Código de indicação inválido');

export const AddressSchema = z.string(REQUIRED).trim().min(1, REQUIRED);

/** Campo opcional: vazio é aceito; preenchido precisa ser ENS ou endereço válido na rede. */
export const OptionalEnsOrAddressSchema = z.string().trim().optional();

export function isValidEnsOrAddress(network: Network, value: string | undefined): boolean {
  if (!value) return true;
  return ENS_PATTERN.test(value.toLowerCase()) || isValidAddress(network, value);
}

// ---------- Paginação ----------

export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  });
}

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
