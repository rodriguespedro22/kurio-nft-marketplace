import type { MockDb } from './schema';

/**
 * Próximo id sequencial do banco (`user-0001`, `order-0002`…). O preenchimento com zeros evita
 * colisão com os ids curtos das fixtures (`user-1`). Use dentro de `db.update`.
 */
export function nextId(d: MockDb, prefix: string): string {
  d.idSeq += 1;
  return `${prefix}-${String(d.idSeq).padStart(4, '0')}`;
}

/** Token opaco e imprevisível (não sequencial). */
export function randomToken(): string {
  return crypto.randomUUID();
}
