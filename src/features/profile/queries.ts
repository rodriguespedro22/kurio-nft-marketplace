import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { UserSchema, type Profile } from '@/contracts';
import { updateSessionUser, useSession } from '@/features/auth/session';
import { qk } from '@/shared/api/query-keys';

import { profileApi } from './api';

export const profileQueries = {
  detail: (userId: string) =>
    queryOptions({
      queryKey: qk.user(userId).profile,
      queryFn: ({ signal }) => profileApi.get(signal),
    }),
};

export function useProfile() {
  const userId = useSession()?.user.id;
  return useQuery({ ...profileQueries.detail(userId ?? ''), enabled: Boolean(userId) });
}

/** Perfil salvo → cache do perfil e usuário da sessão (o header mostra o nome e o avatar novos). */
function useStoreProfile() {
  const queryClient = useQueryClient();
  return (profile: Profile) => {
    queryClient.setQueryData(qk.user(profile.id).profile, profile);
    updateSessionUser(UserSchema.parse(profile));
  };
}

export function useUpdateProfile() {
  const store = useStoreProfile();
  return useMutation({ mutationFn: profileApi.update, onSuccess: store });
}

export function useUploadAvatar() {
  const store = useStoreProfile();
  return useMutation({ mutationFn: profileApi.uploadAvatar, onSuccess: store });
}

export function useRemoveAvatar() {
  const store = useStoreProfile();
  return useMutation({ mutationFn: profileApi.removeAvatar, onSuccess: store });
}

export function useChangePassword() {
  return useMutation({ mutationFn: profileApi.changePassword });
}
