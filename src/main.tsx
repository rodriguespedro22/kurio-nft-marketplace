import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/globals.css';

import { App } from './app/App';

async function bootstrap() {
  // Import dinâmico: com mocks desligados, nada de `src/mocks` entra no bundle principal.
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { enableMocking } = await import('./mocks/browser');
    await enableMocking();
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Elemento #root não encontrado');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
