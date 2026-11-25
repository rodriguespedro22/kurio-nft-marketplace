import { createFileRoute } from '@tanstack/react-router';

import { TransactionView } from '@/features/explorer/components/TransactionView';

export const Route = createFileRoute('/explorador/tx/$hash')({
  component: TransactionPage,
});

function TransactionPage() {
  const { hash } = Route.useParams();
  return (
    <div className="container-page flex flex-col gap-6 py-4 md:py-8">
      <title>Transação · Kurio</title>
      <h1 className="sr-only">Explorador de transações</h1>
      <TransactionView key={hash} hash={hash} />
    </div>
  );
}
