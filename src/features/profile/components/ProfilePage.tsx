import { AccountLayout } from '@/features/account/components/AccountLayout';
import { PageError } from '@/shared/ui/page-error';
import { Skeleton } from '@/shared/ui/skeleton';

import { useProfile } from '../queries';
import { PasswordForm } from './PasswordForm';
import { ProfileForm } from './ProfileForm';

function ProfileSkeleton() {
  return (
    <div data-testid="profile-skeleton" aria-hidden="true" className="flex flex-col gap-6">
      <Skeleton className="h-6 w-56" />
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Meu perfil: "Perfil do colecionador" + "Alterar senha". */
export function ProfilePage() {
  const profile = useProfile();

  return (
    <AccountLayout title="Meu perfil">
      <title>Meu perfil · Kurio</title>
      {profile.isPending ? (
        <ProfileSkeleton />
      ) : profile.isError ? (
        <PageError
          error={profile.error}
          title="Não foi possível carregar seu perfil"
          onRetry={() => void profile.refetch()}
        />
      ) : (
        <>
          <ProfileForm key={profile.data.id} profile={profile.data} />
          <PasswordForm />
        </>
      )}
    </AccountLayout>
  );
}
