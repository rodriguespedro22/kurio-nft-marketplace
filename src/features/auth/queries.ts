import { useMutation } from '@tanstack/react-query';

import type { AuthResponse, LoginInput, RegisterInput } from '@/contracts';

import { authApi } from './api';
import { setSession } from './session';
import { signOutLocal } from './sign-out';

const toSession = ({ token, user, expiresAt }: AuthResponse) => ({ token, user, expiresAt });

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (response) => setSession(toSession(response)),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (response) => setSession(toSession(response)),
  });
}

/** Logout no servidor (best effort) e sempre local — sem rede, a sessão local sai do mesmo jeito. */
export function useLogout() {
  return useMutation({
    mutationFn: () => authApi.logout().catch(() => undefined),
    onSettled: () => signOutLocal('logout'),
  });
}
