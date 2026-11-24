import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AuthResponse, LoginInput, RegisterInput } from '@/contracts';
import { mergeGuestCart } from '@/features/cart/queries';

import { authApi } from './api';
import { setSession } from './session';
import { signOutLocal } from './sign-out';

const toSession = ({ token, user, expiresAt }: AuthResponse) => ({ token, user, expiresAt });

/** Login/cadastro: grava a sessão e traz o carrinho de visitante antes de seguir (redirect). */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: async (response) => {
      setSession(toSession(response));
      await mergeGuestCart(queryClient);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: async (response) => {
      setSession(toSession(response));
      await mergeGuestCart(queryClient);
    },
  });
}

/** Logout no servidor (best effort) e sempre local — sem rede, a sessão local sai do mesmo jeito. */
export function useLogout() {
  return useMutation({
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: () => signOutLocal('logout'),
  });
}
