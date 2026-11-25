import type { Wallet, WalletInput, WalletSlot } from '@/contracts';

export const SLOT_TITLES: Record<WalletSlot, string> = {
  primary: 'Carteira principal',
  secondary: 'Carteira secundária',
};

/** Select sem opção escolhida: o schema recusa com "Selecione uma rede" / "Selecione uma carteira". */
const UNSELECTED = '' as never;

type Account = { displayName: string; email: string };

/** Valores iniciais do formulário: os da carteira salva ou, numa nova, nome e e-mail da conta. */
export function walletFormValues(slot: WalletSlot, wallet?: Wallet, account?: Account): WalletInput {
  if (wallet) {
    const { displayName, label, network, profileName, address, provider, referralCode, email, ensName } =
      wallet;
    return {
      slot,
      displayName,
      label,
      network,
      profileName,
      address,
      secondaryAddressOrEns: wallet.secondaryAddressOrEns ?? '',
      provider,
      referralCode,
      email,
      ensName,
    };
  }
  return {
    slot,
    displayName: account?.displayName ?? '',
    label: '',
    network: UNSELECTED,
    profileName: '',
    address: '',
    secondaryAddressOrEns: '',
    provider: UNSELECTED,
    referralCode: '',
    email: account?.email ?? '',
    ensName: '',
  };
}

/** "Igual à carteira principal": os dados da principal no formulário da secundária; o apelido fica. */
export function copyFromPrimary(primary: Wallet, current: WalletInput): WalletInput {
  return { ...walletFormValues(current.slot, primary), label: current.label };
}

const ENS_SUFFIX = /\.eth$/i;

/** O campo "Nome ENS" mostra só o nome; o sufixo `.eth` fica fixo ao lado. */
export const ensLabel = (ensName: string) => ensName.replace(ENS_SUFFIX, '');

export function ensFromLabel(label: string): string {
  const name = label.replace(ENS_SUFFIX, '');
  return name ? `${name}.eth` : '';
}
