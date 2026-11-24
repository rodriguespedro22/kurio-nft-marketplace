import type { MockDb } from '../db/schema';
import type { NetworkProfileName } from '../network/profiles';

export const SCENARIO_NAMES = [
  'default',
  'empty-catalog',
  'slow-network',
  'out-of-order',
  'server-errors',
  'session-expired',
  'register-conflict',
  'coupon-invalid',
  'price-change-during-checkout',
  'sold-out-during-checkout',
  'order-timeout-idempotent',
  'payment-confirmed',
  'payment-declined',
] as const;
export type ScenarioName = (typeof SCENARIO_NAMES)[number];

export type ScenarioConfig = {
  name: ScenarioName;
  /** Rótulo pt-BR para o painel de cenários. */
  label: string;
  description: string;
  network: NetworkProfileName;
  sessionTtlMs: number;
  orderOutcome: 'confirmed' | 'rejected';
  orderResolveMs: number;
  rejectionReason?: string;
  /** Atraso da 1ª resposta de `POST /orders` (o pedido já foi criado). */
  orderCreateDelayMs?: number;
  onFirstCheckoutQuote?: 'price_change' | 'sold_out';
  /** Buscas em `/nfts` respondem na ordem inversa (a mais antiga chega por último). */
  outOfOrderSearch?: boolean;
  /** Catálogo e categorias respondem 503 persistente. */
  serverErrors?: boolean;
  registerConflictField?: 'username';
  /** Todo cupom é recusado como inválido. */
  couponsDisabled?: boolean;
  /** `POST /wallets/:id/connect` sempre recusa. */
  declineWalletConnect?: boolean;
  seedOverrides?: (db: MockDb) => void;
};

const HOUR = 60 * 60 * 1000;

const base = {
  network: 'normal',
  sessionTtlMs: 2 * HOUR,
  orderOutcome: 'confirmed',
  orderResolveMs: 4000,
} as const satisfies Partial<ScenarioConfig>;

export const SCENARIOS: Record<ScenarioName, ScenarioConfig> = {
  default: { ...base, name: 'default', label: 'Padrão', description: 'Catálogo completo, rede normal.' },
  'empty-catalog': {
    ...base,
    name: 'empty-catalog',
    label: 'Catálogo vazio',
    description: 'Nenhum NFT listado.',
    seedOverrides: (db) => {
      db.nfts = [];
    },
  },
  'slow-network': {
    ...base,
    name: 'slow-network',
    label: 'Rede lenta',
    description: 'Toda resposta demora ~2,5 s (skeletons visíveis).',
    network: 'slow',
  },
  'out-of-order': {
    ...base,
    name: 'out-of-order',
    label: 'Respostas fora de ordem',
    description: 'Buscas antigas respondem depois das novas.',
    outOfOrderSearch: true,
  },
  'server-errors': {
    ...base,
    name: 'server-errors',
    label: 'Erros do servidor',
    description: 'Catálogo responde 503 (estado de erro com tentar novamente).',
    serverErrors: true,
  },
  'session-expired': {
    ...base,
    name: 'session-expired',
    label: 'Sessão curta',
    description: 'Tokens expiram 60 s após o login.',
    sessionTtlMs: 60_000,
  },
  'register-conflict': {
    ...base,
    name: 'register-conflict',
    label: 'Conflito no cadastro',
    description: 'Cadastro recusa o nome de usuário (409).',
    registerConflictField: 'username',
  },
  'coupon-invalid': {
    ...base,
    name: 'coupon-invalid',
    label: 'Cupom inválido',
    description: 'Todo cupom é recusado.',
    couponsDisabled: true,
  },
  'price-change-during-checkout': {
    ...base,
    name: 'price-change-during-checkout',
    label: 'Preço muda no checkout',
    description: 'O preço de um item sobe ao criar a 1ª cotação do checkout.',
    onFirstCheckoutQuote: 'price_change',
  },
  'sold-out-during-checkout': {
    ...base,
    name: 'sold-out-during-checkout',
    label: 'Esgota no checkout',
    description: 'Um item esgota ao criar a 1ª cotação do checkout.',
    onFirstCheckoutQuote: 'sold_out',
  },
  'order-timeout-idempotent': {
    ...base,
    name: 'order-timeout-idempotent',
    label: 'Timeout no pedido',
    description: 'A 1ª resposta do pedido atrasa 12 s; o reenvio usa a mesma chave.',
    orderCreateDelayMs: 12_000,
  },
  'payment-confirmed': {
    ...base,
    name: 'payment-confirmed',
    label: 'Pagamento confirmado',
    description: 'Pedidos são confirmados após 4 s.',
  },
  'payment-declined': {
    ...base,
    name: 'payment-declined',
    label: 'Pagamento recusado',
    description: 'Pedidos são recusados e a carteira recusa conexão.',
    orderOutcome: 'rejected',
    rejectionReason: 'Pagamento recusado pela carteira. Nenhum valor foi debitado.',
    declineWalletConnect: true,
  },
};

export function isScenarioName(value: unknown): value is ScenarioName {
  return typeof value === 'string' && (SCENARIO_NAMES as readonly string[]).includes(value);
}
