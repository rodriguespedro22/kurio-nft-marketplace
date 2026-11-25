import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/globals.css';

async function bootstrap() {
  // App e mocks baixam em paralelo (antes: o chunk dos mocks só começava depois do app avaliado).
  // Import dinâmico dos mocks: com eles desligados, nada de `src/mocks` entra no bundle.
  const appModule = import('./app/App');
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { enableMocking } = await import('./mocks/browser');
    await enableMocking();
  }
  const { App } = await appModule;

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Elemento #root não encontrado');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
