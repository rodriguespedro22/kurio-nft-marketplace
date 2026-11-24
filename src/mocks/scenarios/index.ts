import { db, type Store } from '../db/store';
import { SCENARIOS, type ScenarioConfig } from './definitions';

export * from './definitions';

/** Configuração do cenário ativo (gravado no banco mock, sobrevive a refresh). */
export function getScenario(store: Store = db): ScenarioConfig {
  return SCENARIOS[store.get().meta.scenario];
}
