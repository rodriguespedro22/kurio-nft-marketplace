import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/** Servidor MSW para testes de unidade/integração no Vitest (mesmos handlers do navegador). */
export const server = setupServer(...handlers);
