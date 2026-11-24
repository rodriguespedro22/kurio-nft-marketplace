import { useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';

import { ensureSessionValidated } from '@/features/auth/sign-out';

import { Providers } from './providers';
import { createQueryClient } from './query-client';
import { createAppRouter } from './router';
import { wireSession } from './wire-session';

// Instâncias únicas por carregamento (fora do componente: o StrictMode não duplica assinaturas).
const queryClient = createQueryClient();
const router = createAppRouter(queryClient);
wireSession(queryClient, router);

export function App() {
  // Só depois do render: o MSW já está ativo quando o App monta.
  useEffect(() => {
    void ensureSessionValidated();
  }, []);

  return (
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>
  );
}
