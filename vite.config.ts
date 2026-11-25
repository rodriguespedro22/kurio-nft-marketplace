import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // O plugin do router precisa vir antes do React: gera src/routeTree.gen.ts e divide as rotas.
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // Só o MSW (via tough-cookie) importa o tldts; veja src/mocks/shims/tldts.ts.
      tldts: path.resolve(import.meta.dirname, 'src/mocks/shims/tldts.ts'),
    },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
