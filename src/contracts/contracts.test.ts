import { describe, expect, test } from 'vitest';

import {
  BuyerSchema,
  CatalogSearchSchema,
  ChangePasswordInputSchema,
  ErrorEnvelopeSchema,
  EthSchema,
  QuoteIssueSchema,
  RealtimeEventSchema,
  RegisterInputSchema,
  WalletInputSchema,
} from './index';

const EVM = '0xA91F6c3B9e2D4f5A8b7C1d0E9f8A7b6C5d4EE82C';
const SOLANA = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

function fieldErrors(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  const out: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    const key = issue.path.join('.');
    out[key] ??= issue.message;
  }
  return out;
}

describe('EthSchema', () => {
  test('rejeita número, notação exponencial e negativo', () => {
    expect(EthSchema.safeParse(0.1).success).toBe(false);
    expect(EthSchema.safeParse('1e3').success).toBe(false);
    expect(EthSchema.safeParse('-1').success).toBe(false);
    expect(EthSchema.safeParse('1.').success).toBe(false);
  });

  test('aceita até 18 casas decimais', () => {
    expect(EthSchema.safeParse('0.000000000000000001').success).toBe(true);
    expect(EthSchema.safeParse('0.0000000000000000001').success).toBe(false);
    expect(EthSchema.safeParse('26.846').success).toBe(true);
  });
});

describe('CatalogSearchSchema', () => {
  test('aplica page 1 por padrão', () => {
    expect(CatalogSearchSchema.parse({}).page).toBe(1);
  });

  test('rejeita page 0', () => {
    expect(CatalogSearchSchema.safeParse({ page: 0 }).success).toBe(false);
  });

  test('normaliza valores que o router lê da URL como número ou item único', () => {
    const parsed = CatalogSearchSchema.parse({
      q: 42,
      minPrice: 0.5,
      category: 'arte-digital',
      network: 'polygon',
      page: '2',
    });
    expect(parsed).toMatchObject({
      q: '42',
      minPrice: '0.5',
      category: ['arte-digital'],
      network: ['polygon'],
      page: 2,
    });
  });

  test('rejeita rede fora da lista e ordenação desconhecida', () => {
    expect(CatalogSearchSchema.safeParse({ network: ['base'] }).success).toBe(false);
    expect(CatalogSearchSchema.safeParse({ sort: 'random' }).success).toBe(false);
  });
});

describe('RealtimeEventSchema', () => {
  const base = { eventId: 'evt-1', version: 3, occurredAt: '2026-11-24T12:00:00.000Z' };

  test('discrimina nft.updated pelo type', () => {
    const event = RealtimeEventSchema.parse({
      ...base,
      type: 'nft.updated',
      resource: { type: 'nft', id: 'nft-1' },
      data: { editions: [{ id: 'ed-1', price: '1.19', available: 4 }], status: 'listed' },
    });
    expect(event.type).toBe('nft.updated');
    if (event.type === 'nft.updated') expect(event.data.editions[0]?.price).toBe('1.19');
  });

  test('discrimina order.updated pelo type', () => {
    const event = RealtimeEventSchema.parse({
      ...base,
      type: 'order.updated',
      userId: 'user-1',
      resource: { type: 'order', id: 'ord-1' },
      data: { status: 'confirmed', txHash: '0xabc', rejectionReason: null, explorerUrl: null },
    });
    expect(event.type).toBe('order.updated');
    if (event.type === 'order.updated') expect(event.data.status).toBe('confirmed');
  });

  test('rejeita dados de pedido num evento de NFT', () => {
    const result = RealtimeEventSchema.safeParse({
      ...base,
      type: 'nft.updated',
      resource: { type: 'nft', id: 'nft-1' },
      data: { status: 'confirmed', txHash: null, rejectionReason: null },
    });
    expect(result.success).toBe(false);
  });
});

describe('ErrorEnvelopeSchema', () => {
  test('lê o envelope de erro com campos', () => {
    const parsed = ErrorEnvelopeSchema.parse({
      error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', fields: { email: 'Inválido' } },
    });
    expect(parsed.error.fields?.email).toBe('Inválido');
  });
});

describe('RegisterInputSchema', () => {
  test('aponta senhas diferentes mesmo com outros campos inválidos', () => {
    const result = RegisterInputSchema.safeParse({
      username: 'colecionador',
      email: 'nao-e-email',
      password: 'Kurio@2026',
      confirmPassword: 'Kurio@2027',
    });
    const errors = fieldErrors(result);
    expect(errors.email).toBe('E-mail inválido');
    expect(errors.confirmPassword).toBe('As senhas não coincidem');
  });

  test('exige senha forte', () => {
    const result = RegisterInputSchema.safeParse({
      username: 'colecionador',
      email: 'novo@kurio.test',
      password: 'fraca',
      confirmPassword: 'fraca',
    });
    expect(fieldErrors(result).password).toBe('Use pelo menos 8 caracteres');
  });

  test('normaliza e-mail', () => {
    const parsed = RegisterInputSchema.parse({
      username: 'colecionador',
      email: '  Novo@Kurio.TEST ',
      password: 'Kurio@2026',
      confirmPassword: 'Kurio@2026',
    });
    expect(parsed.email).toBe('novo@kurio.test');
  });
});

describe('ChangePasswordInputSchema', () => {
  test('exige confirmação igual', () => {
    const result = ChangePasswordInputSchema.safeParse({
      currentPassword: 'Kurio@2026',
      newPassword: 'Nova@2027x',
      confirmPassword: 'Nova@2027y',
    });
    expect(fieldErrors(result).confirmPassword).toBe('As senhas não coincidem');
  });
});

describe('endereço de carteira por rede', () => {
  const buyer = {
    displayName: 'Colecionador',
    username: 'colecionador',
    network: 'ethereum',
    profileName: 'Coleção Principal',
    walletAddress: EVM,
    walletType: 'metamask',
    referralCode: 'KURIO-2026',
    email: 'colecionador@kurio.test',
    ensName: 'colecionador.eth',
    useOtherWallet: false,
  };

  test('aceita endereço EVM na Ethereum', () => {
    expect(BuyerSchema.safeParse(buyer).success).toBe(true);
  });

  test('rejeita endereço Solana na Ethereum, no campo do endereço', () => {
    const result = BuyerSchema.safeParse({ ...buyer, walletAddress: SOLANA });
    expect(fieldErrors(result).walletAddress).toBe('Endereço inválido para a rede selecionada');
  });

  test('aceita endereço base58 na Solana', () => {
    expect(BuyerSchema.safeParse({ ...buyer, network: 'solana', walletAddress: SOLANA }).success).toBe(true);
  });

  test('ENS ou carteira secundária opcional, mas validado quando preenchido', () => {
    expect(BuyerSchema.safeParse({ ...buyer, secondaryWalletOrEns: '' }).success).toBe(true);
    expect(BuyerSchema.safeParse({ ...buyer, secondaryWalletOrEns: 'reserva.eth' }).success).toBe(true);
    const result = BuyerSchema.safeParse({ ...buyer, secondaryWalletOrEns: 'qualquer coisa' });
    expect(fieldErrors(result).secondaryWalletOrEns).toBe('Informe um ENS ou endereço válido');
  });

  test('selects vazios pedem seleção', () => {
    const result = BuyerSchema.safeParse({ ...buyer, network: '', walletType: '' });
    const errors = fieldErrors(result);
    expect(errors.network).toBe('Selecione uma rede');
    expect(errors.walletType).toBe('Selecione uma carteira');
  });

  test('carteira valida o endereço pela rede', () => {
    const wallet = {
      slot: 'primary',
      displayName: 'Colecionador',
      label: 'Principal',
      network: 'polygon',
      profileName: 'Coleção Principal',
      address: SOLANA,
      provider: 'metamask',
      referralCode: 'KURIO-2026',
      email: 'colecionador@kurio.test',
      ensName: 'colecionador.eth',
    };
    expect(fieldErrors(WalletInputSchema.safeParse(wallet)).address).toBe(
      'Endereço inválido para a rede selecionada',
    );
    expect(WalletInputSchema.safeParse({ ...wallet, address: EVM }).success).toBe(true);
  });
});

describe('QuoteIssueSchema', () => {
  test('discrimina o tipo de problema', () => {
    expect(
      QuoteIssueSchema.parse({ cartItemId: 'c1', kind: 'price_changed', previous: '1.19', current: '1.29' }),
    ).toMatchObject({ kind: 'price_changed' });
    expect(
      QuoteIssueSchema.parse({ cartItemId: 'c1', kind: 'insufficient', requested: 3, available: 1 }),
    ).toMatchObject({ available: 1 });
    expect(QuoteIssueSchema.safeParse({ cartItemId: 'c1', kind: 'price_changed' }).success).toBe(false);
  });
});
