import { z } from 'zod';

import { ProfileSchema, type ChangePasswordInput, type Profile, type UpdateProfileInput } from '@/contracts';
import { request } from '@/shared/api/client';

export const profileApi = {
  get: (signal?: AbortSignal): Promise<Profile> => request({ url: '/me', signal }, ProfileSchema),

  update: (input: UpdateProfileInput): Promise<Profile> =>
    request({ url: '/me', method: 'PATCH', data: input }, ProfileSchema),

  /** `multipart/form-data`, campo `avatar` (o navegador define o boundary). */
  uploadAvatar: (file: File): Promise<Profile> => {
    const form = new FormData();
    form.append('avatar', file);
    return request({ url: '/me/avatar', method: 'POST', data: form }, ProfileSchema);
  },

  removeAvatar: (): Promise<Profile> => request({ url: '/me/avatar', method: 'DELETE' }, ProfileSchema),

  /** 204; o servidor encerra todas as sessões do usuário. */
  changePassword: (input: ChangePasswordInput): Promise<void> =>
    request({ url: '/me/password', method: 'POST', data: input }, z.unknown()).then(() => undefined),
};
