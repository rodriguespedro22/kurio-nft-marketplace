import { AccountLayout } from '@/features/account/components/AccountLayout';
import { useSession } from '@/features/auth/session';
import { PageError } from '@/shared/ui/page-error';
import { Skeleton } from '@/shared/ui/skeleton';

import { useWallets } from '../queries';
import { WalletSlotCard } from './WalletSlotCard';

function WalletsSkeleton() {
  return (
    <div data-testid="wallets-skeleton" aria-hidden="true" className="flex flex-col gap-6">
      <Skeleton className="h-7 w-52" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <div className="grid gap-x-7 gap-y-6 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Carteiras: exatamente dois slots, principal e secundária. */
export function WalletsPage() {
  const session = useSession();
  const wallets = useWallets();
  const account = { displayName: session?.user.displayName ?? '', email: session?.user.email ?? '' };
  const primary = wallets.data?.find((w) => w.slot === 'primary');
  const secondary = wallets.data?.find((w) => w.slot === 'secondary');

  return (
    <AccountLayout title="Carteiras">
      <title>Carteiras · Kurio</title>
      {wallets.isPending ? (
        <WalletsSkeleton />
      ) : wallets.isError ? (
        <PageError
          error={wallets.error}
          title="Não foi possível carregar suas carteiras"
          onRetry={() => void wallets.refetch()}
        />
      ) : (
        <>
          <WalletSlotCard slot="primary" wallet={primary} account={account} />
          <WalletSlotCard slot="secondary" wallet={secondary} primary={primary} account={account} />
        </>
      )}
    </AccountLayout>
  );
}
