import type { ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { RealtimeSync } from '@/features/realtime-sync/RealtimeSync';
import { RealtimeProvider } from '@/shared/realtime/RealtimeProvider';

type ProvidersProps = { queryClient: QueryClient; children: ReactNode };

export function Providers({ queryClient, children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <RealtimeSync />
        {children}
      </RealtimeProvider>
      <Toaster
        theme="dark"
        position="top-center"
        closeButton
        toastOptions={{
          classNames: {
            toast: '!bg-surface-raised !border-border !text-foreground !font-sans',
            description: '!text-secondary',
          },
        }}
      />
    </QueryClientProvider>
  );
}
