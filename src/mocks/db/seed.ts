import { SEED_NFTS } from '../fixtures/nfts';
import { SEED_USERS, SEED_WALLETS } from '../fixtures/users';
import type { ScenarioConfig } from '../scenarios/definitions';
import { MOCK_DB_VERSION, type MockDb } from './schema';

/** Banco novo e independente das fixtures (cópia profunda) para o cenário dado. */
export function createSeed(scenario: ScenarioConfig): MockDb {
  const db: MockDb = {
    meta: {
      version: MOCK_DB_VERSION,
      scenario: scenario.name,
      network: scenario.network,
      firstCheckoutQuoteHandled: false,
    },
    users: structuredClone([...SEED_USERS]),
    sessions: [],
    nfts: structuredClone([...SEED_NFTS]),
    carts: {},
    favorites: {},
    quotes: {},
    orders: {},
    wallets: structuredClone([...SEED_WALLETS]),
    idempotency: {},
    eventSeq: 0,
    idSeq: 0,
  };
  scenario.seedOverrides?.(db);
  return db;
}
