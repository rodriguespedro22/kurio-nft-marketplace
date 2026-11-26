import { BuyerSchema, type Buyer, type Profile, type Wallet } from '@/contracts';

/** Campos do frame Pagamento; obrigatórios conforme o `*` do layout (validação do contrato). */
export const buyerSchema = BuyerSchema;
export type BuyerFormValues = Buyer;

/** Ordem dos campos na tela — a mesma usada para mapear erros da API. */
export const BUYER_FIELDS = [
  'displayName',
  'username',
  'network',
  'profileName',
  'walletAddress',
  'secondaryWalletOrEns',
  'walletType',
  'referralCode',
  'email',
  'ensName',
  'useOtherWallet',
  'notes',
] as const satisfies readonly (keyof Buyer)[];

/** Select sem opção escolhida: o schema recusa com "Selecione uma rede" / "Selecione uma carteira". */
const UNSELECTED = '' as never;

/** Formulário sem carteira escolhida: o que a conta já sabe (perfil) e o resto vazio. */
export function emptyBuyer(profile: Profile): Buyer {
  return {
    displayName: profile.displayName,
    username: profile.username,
    network: UNSELECTED,
    profileName: '',
    walletAddress: '',
    secondaryWalletOrEns: '',
    walletType: UNSELECTED,
    referralCode: '',
    email: profile.email,
    ensName: profile.ensName ?? '',
    useOtherWallet: false,
    notes: '',
  };
}

/** Carteira escolhida em "Carteira conectada": os dados dela no formulário; usuário e observação ficam. */
export function buyerFromWallet(wallet: Wallet, current: Buyer): Buyer {
  return {
    ...current,
    displayName: wallet.displayName,
    network: wallet.network,
    profileName: wallet.profileName,
    walletAddress: wallet.address,
    secondaryWalletOrEns: wallet.secondaryAddressOrEns ?? '',
    walletType: wallet.provider,
    referralCode: wallet.referralCode,
    email: wallet.email,
    ensName: wallet.ensName,
  };
}
