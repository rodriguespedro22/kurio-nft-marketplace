import type { ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { useMediaQuery } from '@/shared/lib/use-media-query';
import { RealtimeSync } from '@/features/realtime-sync/RealtimeSync';
import { RealtimeProvider } from '@/shared/realtime/RealtimeProvider';

type ProvidersProps = { queryClient: QueryClient; children: ReactNode };

export function Providers({ queryClient, children }: ProvidersProps) {
  // No celular não há header: avisos no topo cobririam o conteúdo; ficam acima da barra inferior.
  const phone = !useMediaQuery('(min-width: 48rem)');
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <RealtimeSync />
        {children}
      </RealtimeProvider>
      <Toaster
        theme="dark"
        position={phone ? 'bottom-center' : 'top-center'}
        mobileOffset={{ bottom: 112 }}
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
