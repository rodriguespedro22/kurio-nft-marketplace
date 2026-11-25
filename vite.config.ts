import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * O entry (`src/main.tsx`) só importa o app e os mocks por import dinâmico, então o navegador só
 * descobre esses chunks depois de baixar e executar o entry: um salto a mais na cadeia até o
 * primeiro dado. Aqui eles (e as dependências estáticas deles) viram `modulepreload` no HTML e
 * baixam junto com o entry. Vale para qualquer rota e cenário: é a sequência de boot do app.
 */
function preloadBootChunks(): Plugin {
  let base = '/';
  return {
    name: 'kurio:preload-boot-chunks',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle, chunk }) {
        if (!bundle || !chunk) return;
        const files = new Set<string>();
        const visit = (file: string) => {
          const entry = bundle[file];
          if (files.has(file) || entry?.type !== 'chunk') return;
          files.add(file);
          entry.imports.forEach(visit);
        };
        chunk.dynamicImports.forEach(visit);
        // O entry e o que ele importa estaticamente o Vite já injeta.
        files.delete(chunk.fileName);
        chunk.imports.forEach((file) => files.delete(file));
        return [...files].map((file) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: true, href: `${base}${file}` },
          injectTo: 'head' as const,
        }));
      },
    },
  };
}

const PATH_TO_REGEXP_SHIM = path.resolve(import.meta.dirname, 'src/mocks/shims/path-to-regexp.ts');

/** Troca o `path-to-regexp` do MSW pela versão com cache (src/mocks/shims/path-to-regexp.ts). */
function memoizedPathToRegexp(): Plugin {
  return {
    name: 'kurio:memoized-path-to-regexp',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source !== 'path-to-regexp' || !importer) return null;
      // O próprio shim importa o original.
      if (path.resolve(importer.split('?')[0]) === PATH_TO_REGEXP_SHIM) return null;
      return PATH_TO_REGEXP_SHIM;
    },
  };
}

export default defineConfig({
  // O plugin do router precisa vir antes do React: gera src/routeTree.gen.ts e divide as rotas.
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    memoizedPathToRegexp(),
    preloadBootChunks(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // Só o cookie store do MSW importa o tough-cookie; veja src/mocks/shims/tough-cookie.ts.
      'tough-cookie': path.resolve(import.meta.dirname, 'src/mocks/shims/tough-cookie.ts'),
    },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
