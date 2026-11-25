import { describe, expect, test } from 'vitest';

import { WalletInputSchema, type Wallet } from '@/contracts';

import { copyFromPrimary, ensFromLabel, ensLabel, walletFormValues } from './form-values';

const primary: Wallet = {
  id: 'wallet-1',
  slot: 'primary',
  displayName: 'Colecionador Kurio',
  label: 'Principal',
  network: 'ethereum',
  profileName: 'Coleção Principal',
  address: `0x${'1a'.repeat(20)}`,
  secondaryAddressOrEns: null,
  provider: 'metamask',
  referralCode: 'KURIO-2026',
  email: 'colecionador@kurio.test',
  ensName: 'colecionador.eth',
  connection: 'connected',
};

describe('valores do formulário de carteira', () => {
  test('carteira nova: nome e e-mail da conta; selects sem escolha são recusados pelo schema', () => {
    const values = walletFormValues('secondary', undefined, { displayName: 'Ana', email: 'ana@kurio.test' });
    expect(values).toMatchObject({
      slot: 'secondary',
      displayName: 'Ana',
      email: 'ana@kurio.test',
      label: '',
    });

    const result = WalletInputSchema.safeParse(values);
    const fields = result.error?.flatten().fieldErrors ?? {};
    expect(fields.network).toEqual(['Selecione uma rede']);
    expect(fields.provider).toEqual(['Selecione uma carteira']);
  });

  test('carteira existente: ENS secundário nulo vira campo vazio e o resultado passa no schema', () => {
    const values = walletFormValues('primary', primary);
    expect(values.secondaryAddressOrEns).toBe('');
    expect(WalletInputSchema.safeParse(values).success).toBe(true);
  });

  test('"Igual à carteira principal" copia os dados para a secundária, mantendo o apelido digitado', () => {
    const current = walletFormValues('secondary', undefined, { displayName: 'X', email: 'x@kurio.test' });
    const copied = copyFromPrimary(primary, { ...current, label: 'Reserva' });
    expect(copied).toMatchObject({
      slot: 'secondary',
      label: 'Reserva',
      address: primary.address,
      provider: 'metamask',
      ensName: 'colecionador.eth',
    });
  });

  test('Nome ENS: o campo mostra só o nome; o valor guardado leva ".eth" (sem duplicar)', () => {
    expect(ensLabel('colecionador.eth')).toBe('colecionador');
    expect(ensFromLabel('colecionador')).toBe('colecionador.eth');
    expect(ensFromLabel('colecionador.eth')).toBe('colecionador.eth');
    expect(ensFromLabel('')).toBe('');
  });
});
