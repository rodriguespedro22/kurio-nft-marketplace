import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { MockPanel } from './MockPanel';

/**
 * Monta o painel de cenários num root React próprio, fora do app. `?panel=0` o esconde (só a
 * regressão visual usa); a demo e o Lighthouse rodam com ele.
 */
export function mountMockPanel(): void {
  if (new URLSearchParams(window.location.search).get('panel') === '0') return;
  const host = document.createElement('div');
  host.id = 'kurio-mock-panel';
  document.body.append(host);
  // Prefixo próprio: dois roots React gerariam os mesmos `useId` (ids duplicados no documento).
  createRoot(host, { identifierPrefix: 'mock-panel-' }).render(createElement(MockPanel));
}
