import type { UserRecord, WalletRecord } from '../db/schema';

// Hashes PBKDF2-SHA256 (100k iterações) de `Kurio@2026` com salts fixos de 16 bytes,
// gerados offline com WebCrypto — o seed é determinístico e a senha nunca fica em claro.
const SEED_PASSWORD_HASH = {
  colecionador: 'pbkdf2-sha256$100000$a3VyaW8tc2VlZC11c2VyMQ==$Z/n2xKo3l/oQbHI47KN9tBRv1XEtqDMQ1Gcwg4NmySE=',
  ana: 'pbkdf2-sha256$100000$a3VyaW8tc2VlZC11c2VyMg==$RK20wzyPLWpqDuXma1NgaNNoiO1FREloCib8kiqwb+c=',
};

export const SEED_USERS: readonly UserRecord[] = [
  {
    id: 'user-1',
    email: 'colecionador@kurio.test',
    displayName: 'Colecionador Kurio',
    username: 'colecionador',
    avatarUrl: null,
    bio: null,
    ensName: 'colecionador.eth',
    walletLabel: 'Principal',
    passwordHash: SEED_PASSWORD_HASH.colecionador,
    createdAt: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 'user-2',
    email: 'ana@kurio.test',
    displayName: 'Ana Ribeiro',
    username: 'ana',
    avatarUrl: null,
    bio: null,
    ensName: null,
    walletLabel: null,
    passwordHash: SEED_PASSWORD_HASH.ana,
    createdAt: '2026-07-15T12:00:00.000Z',
  },
];

/** Usuário 1 nasce com a carteira principal; usuário 2 sem carteiras. */
export const SEED_WALLETS: readonly WalletRecord[] = [
  {
    id: 'wallet-1',
    userId: 'user-1',
    slot: 'primary',
    displayName: 'Colecionador Kurio',
    label: 'Principal',
    network: 'ethereum',
    profileName: 'Coleção Principal',
    address: '0xA91F6c3B9e2D4f5A8b7C1d0E9f8A7b6C5d4EE82C',
    secondaryAddressOrEns: null,
    provider: 'metamask',
    referralCode: 'KURIO-2026',
    email: 'colecionador@kurio.test',
    ensName: 'colecionador.eth',
    connection: 'connected',
  },
];
