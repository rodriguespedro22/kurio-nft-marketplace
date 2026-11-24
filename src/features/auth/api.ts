import {
  AuthResponseSchema,
  SessionInfoSchema,
  type AuthResponse,
  type LoginInput,
  type RegisterInput,
  type SessionInfo,
} from '@/contracts';
import { apiClient, request } from '@/shared/api/client';

export const authApi = {
  register: (input: RegisterInput): Promise<AuthResponse> =>
    request({ method: 'POST', url: '/auth/register', data: input }, AuthResponseSchema),

  login: (input: LoginInput): Promise<AuthResponse> =>
    request({ method: 'POST', url: '/auth/login', data: input }, AuthResponseSchema),

  /** Revalida o token guardado; o 401 é tratado por quem chama (boot), não pelo interceptor. */
  session: (signal?: AbortSignal): Promise<SessionInfo> =>
    request({ url: '/auth/session', signal, skipUnauthorizedHandler: true }, SessionInfoSchema),

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout', null, { skipUnauthorizedHandler: true });
  },
};
