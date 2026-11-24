import type { RealtimeEvent } from '@/contracts';

export type EventGate = {
  /** `true` se o evento deve ser aplicado; registra o `eventId` e a versão do recurso. */
  accept(event: RealtimeEvent): boolean;
  reset(): void;
};

/**
 * Porta de entrada dos eventos do socket (ARCHITECTURE.md §3): descarta `eventId` repetido (janela dos
 * últimos `maxIds`) e versão menor ou igual à última aceita do mesmo recurso — reentrega e
 * chegada fora de ordem nunca fazem o estado regredir.
 */
export function createEventGate(maxIds = 500): EventGate {
  // Set preserva a ordem de inserção: o primeiro item é sempre o mais antigo.
  const seen = new Set<string>();
  const versions = new Map<string, number>();

  return {
    accept(event) {
      if (seen.has(event.eventId)) return false;
      const resource = `${event.resource.type}:${event.resource.id}`;
      const last = versions.get(resource);
      if (last !== undefined && event.version <= last) return false;

      seen.add(event.eventId);
      if (seen.size > maxIds) seen.delete(seen.values().next().value as string);
      versions.set(resource, event.version);
      return true;
    },
    reset() {
      seen.clear();
      versions.clear();
    },
  };
}
