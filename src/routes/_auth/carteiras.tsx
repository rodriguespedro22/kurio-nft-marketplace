import { createFileRoute } from '@tanstack/react-router';

import { WalletsPage } from '@/features/wallets/components/WalletsPage';

export const Route = createFileRoute('/_auth/carteiras')({
  component: WalletsPage,
});
