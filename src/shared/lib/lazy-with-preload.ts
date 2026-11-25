import { lazy, type ComponentType } from 'react';

/** `React.lazy` com `preload()`: baixa o chunk antes do primeiro render (ociosidade, hover, foco). */
export function lazyWithPreload<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  let pending: Promise<{ default: ComponentType<P> }> | undefined;
  const preload = () => (pending ??= load());
  return Object.assign(lazy(preload), { preload });
}

/**
 * Roda `task` depois do `load` da página, quando o navegador estiver ocioso: tira do caminho
 * crítico o que só é usado após uma interação (menus e popovers do header).
 */
export function whenIdle(task: () => void): () => void {
  let cancelled = false;
  let cancelIdle = () => {};
  const schedule = () => {
    if (cancelled) return;
    // Safari não tem requestIdleCallback: cai num atraso curto.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(task, { timeout: 3000 });
      cancelIdle = () => window.cancelIdleCallback(id);
    } else {
      const id = setTimeout(task, 1000);
      cancelIdle = () => clearTimeout(id);
    }
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', schedule);
    cancelIdle();
  };
}
