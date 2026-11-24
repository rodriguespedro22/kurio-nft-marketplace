import { isNetworkProfile } from '../network/profiles';
import { isScenarioName } from '../scenarios/definitions';
import { MOCK_DB_VERSION, type MockDb } from './schema';

export const MOCK_DB_STORAGE_KEY = 'kurio:mockdb:v1';

function looksLikeMockDb(value: unknown): value is MockDb {
  if (!value || typeof value !== 'object') return false;
  const db = value as Partial<MockDb>;
  return (
    db.meta?.version === MOCK_DB_VERSION &&
    isScenarioName(db.meta.scenario) &&
    isNetworkProfile(db.meta.network) &&
    Array.isArray(db.users) &&
    Array.isArray(db.nfts) &&
    Array.isArray(db.wallets) &&
    typeof db.carts === 'object' &&
    typeof db.orders === 'object'
  );
}

/** Lê o banco persistido; qualquer dado ausente, corrompido ou de outra versão vira `null`. */
export function readDb(storage: Storage | null): MockDb | null {
  try {
    const raw = storage?.getItem(MOCK_DB_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return looksLikeMockDb(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDb(storage: Storage | null, db: MockDb): void {
  try {
    storage?.setItem(MOCK_DB_STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage cheio ou bloqueado: o mock segue só em memória nesta aba.
  }
}
