import { describe, expect, test } from 'vitest';

import { BuyerSchema, type Profile, type Wallet } from '@/contracts';

import { clearCheckoutDraft, loadCheckoutDraft, saveCheckoutDraft } from './draft';
import { buyerFromWallet, emptyBuyer } from './schema';

const PROFILE: Profile = {
  id: 'user-1',
  email: 'colecionador@kurio.test',
  displayName: 'Colecionador Kurio',
  username: 'colecionador',
  avatarUrl: null,
  bio: null,
  ensName: 'colecionador.eth',
  walletLabel: 'Principal',
};

const WALLET: Wallet = {
  id: 'wallet-1',
  slot: 'primary',
  displayName: 'Coleção Kurio',
  label: 'Principal',
  network: 'ethereum',
  profileName: 'Coleção Principal',
  address: '0xA91F6c3B9e2D4f5A8b7C1d0E9f8A7b6C5d4EE82C',
  secondaryAddressOrEns: null,
  provider: 'metamask',
  referralCode: 'KURIO-2026',
  email: 'carteira@kurio.test',
  ensName: 'colecionador.eth',
  connection: 'connected',
};

describe('formulário do comprador', () => {
  test('sem carteira: nome, usuário, e-mail e ENS vêm do perfil; o resto fica para escolher', () => {
    const buyer = emptyBuyer(PROFILE);
    expect(buyer).toMatchObject({
      displayName: 'Colecionador Kurio',
      username: 'colecionador',
      email: 'colecionador@kurio.test',
      ensName: 'colecionador.eth',
      network: '',
      walletType: '',
      walletAddress: '',
      useOtherWallet: false,
    });
    expect(BuyerSchema.safeParse(buyer).success).toBe(false);
  });

  test('carteira escolhida preenche os campos dela e mantém usuário e observação', () => {
    const current = { ...emptyBuyer(PROFILE), notes: 'Entregar na principal' };
    const buyer = buyerFromWallet(WALLET, current);
    expect(buyer).toMatchObject({
      displayName: 'Coleção Kurio',
      username: 'colecionador',
      network: 'ethereum',
      profileName: 'Coleção Principal',
      walletAddress: WALLET.address,
      secondaryWalletOrEns: '',
      walletType: 'metamask',
      referralCode: 'KURIO-2026',
      email: 'carteira@kurio.test',
      notes: 'Entregar na principal',
    });
    expect(BuyerSchema.safeParse(buyer).success).toBe(true);
  });
});

describe('rascunho do checkout (sessionStorage)', () => {
  test('salva e recupera por usuário', () => {
    const buyer = buyerFromWallet(WALLET, emptyBuyer(PROFILE));
    saveCheckoutDraft('user-1', { walletId: 'wallet-1', buyer: { ...buyer, network: 'polygon' } });

    expect(loadCheckoutDraft('user-1')).toEqual({
      walletId: 'wallet-1',
      buyer: { ...buyer, network: 'polygon' },
    });
    expect(loadCheckoutDraft('user-2')).toBeNull();

    clearCheckoutDraft('user-1');
    expect(loadCheckoutDraft('user-1')).toBeNull();
  });

  test('rascunho corrompido é ignorado; campo com valor inválido é descartado', () => {
    sessionStorage.setItem('kurio:checkout-draft:user-1', '{nope');
    expect(loadCheckoutDraft('user-1')).toBeNull();

    sessionStorage.setItem(
      'kurio:checkout-draft:user-1',
      JSON.stringify({ walletId: null, buyer: { network: 'marte', username: 'colecionador' } }),
    );
    expect(loadCheckoutDraft('user-1')).toEqual({ walletId: null, buyer: { username: 'colecionador' } });
  });
});
