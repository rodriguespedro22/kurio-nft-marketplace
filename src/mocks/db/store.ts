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
  /** Esquece o estado em memória: a próxima leitura volta ao storage (outra aba gravou). */
  invalidate(): void;
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
    invalidate() {
      state = null;
    },
  };
}

export const db = createStore();

/**
 * Cada aba roda o próprio banco simulado em memória. Quando outra aba grava (login cria a sessão
 * lá, por exemplo), esta passa a ler o storage de novo; senão responderia 401 ao token novo e
 * encerraria a sessão nas duas abas.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === MOCK_DB_STORAGE_KEY || event.key === null) db.invalidate();
  });
}
