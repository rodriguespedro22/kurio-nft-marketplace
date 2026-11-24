import type { Politeness } from './live-region';

const REGION_IDS: Record<Politeness, string> = {
  polite: 'kurio-announcer-polite',
  assertive: 'kurio-announcer-assertive',
};

function getAnnouncerNode(politeness: Politeness): HTMLElement {
  const existing = document.getElementById(REGION_IDS[politeness]);
  if (existing) return existing;

  const node = document.createElement('div');
  node.id = REGION_IDS[politeness];
  node.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
  node.setAttribute('aria-live', politeness);
  node.setAttribute('aria-atomic', 'true');
  node.className = 'sr-only';
  document.body.appendChild(node);
  return node;
}

const pending: Partial<Record<Politeness, ReturnType<typeof setTimeout>>> = {};

/**
 * Anuncia uma mensagem global para leitores de tela, sem depender de componente montado.
 * A região é criada vazia e preenchida no tick seguinte, para que a mesma mensagem repetida
 * (ex.: "Item adicionado" duas vezes) seja anunciada de novo.
 */
export function announce(message: string, politeness: Politeness = 'polite'): void {
  if (typeof document === 'undefined') return;
  const node = getAnnouncerNode(politeness);
  node.textContent = '';
  clearTimeout(pending[politeness]);
  pending[politeness] = setTimeout(() => {
    node.textContent = message;
  }, 50);
}
