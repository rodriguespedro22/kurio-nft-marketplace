import { createContext, useContext, useEffect, useEffectEvent } from 'react';

import type { RealtimeEvent, RealtimeEventType } from '@/contracts';

/**
 * `reconnecting` cobre também a primeira conexão; `offline` = navegador sem rede
 * (o socket.io continua tentando e volta sozinho quando a rede volta).
 */
export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

type EventOf<T extends RealtimeEventType> = Extract<RealtimeEvent, { type: T }>;
type Listener = (event: RealtimeEvent) => void;

export type RealtimeBus = {
  subscribe(type: RealtimeEventType, listener: Listener): () => void;
  /** Só o provider chama: entrega um evento que já passou pela validação, dono e gate. */
  dispatch(event: RealtimeEvent): void;
};

export function createRealtimeBus(): RealtimeBus {
  const listeners = new Map<RealtimeEventType, Set<Listener>>();
  return {
    subscribe(type, listener) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
      return () => set.delete(listener);
    },
    dispatch(event) {
      for (const listener of [...(listeners.get(event.type) ?? [])]) listener(event);
    },
  };
}

/** Sem provider (testes de componente): nenhum evento, status offline. */
export const RealtimeBusContext = createContext<RealtimeBus>(createRealtimeBus());
export const RealtimeStatusContext = createContext<ConnectionStatus>('offline');

/**
 * Escuta um tipo de evento enquanto o componente estiver montado (cleanup no unmount). O handler
 * sempre vê props/estado atuais sem reinscrever a cada render.
 */
export function useRealtimeEvent<T extends RealtimeEventType>(
  type: T,
  handler: (event: EventOf<T>) => void,
): void {
  const bus = useContext(RealtimeBusContext);
  const onEvent = useEffectEvent((event: RealtimeEvent) => handler(event as EventOf<T>));
  useEffect(() => bus.subscribe(type, (event) => onEvent(event)), [bus, type]);
}

export function useRealtimeStatus(): ConnectionStatus {
  return useContext(RealtimeStatusContext);
}
