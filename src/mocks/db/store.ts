import { SCENARIOS, type ScenarioName } from '../scenarios/definitions';
import { MOCK_DB_STORAGE_KEY, readDb, writeDb } from './persist';
import type { MockDb } from './schema';
import { createSeed } from './seed';

export { MOCK_DB_STORAGE_KEY };

export type Store = {
  /** Estado atual (carregado do storage ou semeado com `default` na 1ª leitura). */
  get(): MockDb;
  /** Muta o estado e persiste. */
  update(fn: (db: MockDb) => void): void;
  /** Restaura integralmente o seed do cenário. */
  reset(scenario?: ScenarioName): void;
};

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function createStore(storage: Storage | null = browserStorage()): Store {
  let state: MockDb | null = null;

  const load = (): MockDb => {
    if (!state) {
      state = readDb(storage);
      if (!state) {
        state = createSeed(SCENARIOS.default);
        writeDb(storage, state);
      }
    }
    return state;
  };

  return {
    get: load,
    update(fn) {
      const current = load();
      fn(current);
      writeDb(storage, current);
    },
    reset(scenario = 'default') {
      state = createSeed(SCENARIOS[scenario]);
      writeDb(storage, state);
    },
  };
}

export const db = createStore();
