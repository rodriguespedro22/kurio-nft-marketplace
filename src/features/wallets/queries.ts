import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Wallet, WalletInput, WalletSlot } from '@/contracts';
import { useSession } from '@/features/auth/session';
import { ApiError } from '@/shared/api/api-error';
import { qk } from '@/shared/api/query-keys';

import { walletsApi } from './api';

const SLOT_ORDER: Record<WalletSlot, number> = { primary: 0, secondary: 1 };

export const walletsQueries = {
  list: (userId: string) =>
    queryOptions({
      queryKey: qk.user(userId).wallets,
      queryFn: ({ signal }) => walletsApi.list(signal),
    }),
};

/** Carteiras do usuário logado (principal antes da secundária). */
export function useWallets() {
  const userId = useSession()?.user.id;
  return useQuery({ ...walletsQueries.list(userId ?? ''), enabled: Boolean(userId) });
}

/** Grava no cache a carteira devolvida pela API (substitui pelo `id`). */
function useStoreWallet() {
  const queryClient = useQueryClient();
  const userId = useSession()?.user.id ?? '';
  return (wallet: Wallet) =>
    queryClient.setQueryData<Wallet[]>(qk.user(userId).wallets, (list = []) =>
      [...list.filter((w) => w.id !== wallet.id), wallet].sort(
        (a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot],
      ),
    );
}

type SaveVariables = { id?: string; input: WalletInput };

/** Cria o slot (`POST`) ou edita a carteira existente (`PATCH`). */
export function useSaveWallet() {
  const store = useStoreWallet();
  return useMutation({
    mutationFn: ({ id, input }: SaveVariables) =>
      id ? walletsApi.update(id, input) : walletsApi.create(input),
    onSuccess: store,
  });
}

/** A conexão foi recusada pela carteira (simulação): o servidor gravou `declined`. */
export const isWalletDeclined = (error: unknown) => error instanceof ApiError && error.code === 'CONFLICT';

export function useConnectWallet() {
  const queryClient = useQueryClient();
  const userId = useSession()?.user.id ?? '';
  const store = useStoreWallet();
  return useMutation({
    mutationFn: (id: string) => walletsApi.connect(id),
    onSuccess: store,
    onError: (error) => {
      if (isWalletDeclined(error)) void queryClient.invalidateQueries({ queryKey: qk.user(userId).wallets });
    },
  });
}

export function useDisconnectWallet() {
  const store = useStoreWallet();
  return useMutation({ mutationFn: (id: string) => walletsApi.disconnect(id), onSuccess: store });
}
