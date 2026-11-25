import { createPrng } from '../db/prng';

/** Perfis de rede simulada aplicados por `withNetwork` a todo handler de dados. */
export const NETWORK_PROFILES = [
  'normal',
  'slow',
  'jitter',
  'offline',
  'flaky',
  'timeout-orders',
  'server-errors',
] as const;
export type NetworkProfileName = (typeof NETWORK_PROFILES)[number];

export function isNetworkProfile(value: unknown): value is NetworkProfileName {
  return typeof value === 'string' && (NETWORK_PROFILES as readonly string[]).includes(value);
}

/** Atraso de `POST /orders` no perfil `timeout-orders` (acima do timeout de 8 s do cliente). */
export const ORDER_TIMEOUT_DELAY_MS = 12_000;

/**
 * Gerador de latência por perfil, semeado: a mesma seed produz a mesma sequência
 * (reprodutível em testes e demos). normal 150–400 ms, slow 2500 ms, jitter 100–3000 ms.
 */
export function createLatency(profile: NetworkProfileName, seed: number): () => number {
  const prng = createPrng(seed);
  switch (profile) {
    case 'offline':
      return () => 0;
    case 'slow':
      return () => 2500;
    case 'jitter':
      return () => prng.int(100, 3000);
    case 'normal':
    case 'flaky':
    case 'timeout-orders':
    case 'server-errors':
      return () => prng.int(150, 400);
  }
}

export type OutOfOrderTracker = { next(): number };

const OUT_OF_ORDER_BASE_MS = 1500;
const OUT_OF_ORDER_STEP_MS = 400;
const OUT_OF_ORDER_FLOOR_MS = 100;
const OUT_OF_ORDER_IDLE_RESET_MS = 2000;

/**
 * Cenário `out-of-order`: cada busca seguida atrasa `1500 - 400·n` ms (mínimo 100), então a
 * requisição mais antiga responde por último. Após 2 s sem buscas o ciclo recomeça.
 */
export function createOutOfOrderTracker(now: () => number = Date.now): OutOfOrderTracker {
  let count = 0;
  let last = Number.NEGATIVE_INFINITY;
  return {
    next() {
      const t = now();
      if (t - last > OUT_OF_ORDER_IDLE_RESET_MS) count = 0;
      last = t;
      const delay = Math.max(OUT_OF_ORDER_FLOOR_MS, OUT_OF_ORDER_BASE_MS - OUT_OF_ORDER_STEP_MS * count);
      count += 1;
      return delay;
    },
  };
}
