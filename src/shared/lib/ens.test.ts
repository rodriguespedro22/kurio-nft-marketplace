import { describe, expect, test } from 'vitest';

import { ensFromLabel, ensLabel } from './ens';

describe('Nome ENS', () => {
  test('o campo mostra só o nome; o valor guardado leva ".eth" (sem duplicar)', () => {
    expect(ensLabel('colecionador.eth')).toBe('colecionador');
    expect(ensFromLabel('colecionador')).toBe('colecionador.eth');
    expect(ensFromLabel('colecionador.eth')).toBe('colecionador.eth');
    expect(ensFromLabel('')).toBe('');
  });
});
