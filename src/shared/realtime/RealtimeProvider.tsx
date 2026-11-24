import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

import { RealtimeEventSchema } from '@/contracts';
import { useSession } from '@/features/auth/session';

import { createEventGate } from './event-gate';
import { createSocket, refreshAfterReconnect } from './socket';
import {
  createRealtimeBus,
  RealtimeBusContext,
  RealtimeStatusContext,
  type ConnectionStatus,
  type RealtimeBus,
} from './use-realtime';

const unreachable = (): ConnectionStatus => (navigator.onLine ? 'reconnecting' : 'offline');

type Wiring = {
  userId: string | null;
  queryClient: QueryClient;
  bus: RealtimeBus;
  setStatus: (status: ConnectionStatus) => void;
};

/** Liga um socket recém-criado ao app e conecta. Devolve o teardown. */
function wire(socket: Socket, { userId, queryClient, bus, setStatus }: Wiring): () => void {
  const gate = createEventGate();
  let wasConnected = false;

  const onConnect = () => {
    setStatus('connected');
    // Só em reconexão: o que mudou enquanto o socket esteve fora volta pelo REST.
    if (wasConnected) void refreshAfterReconnect(queryClient);
    wasConnected = true;
  };
  const onDisconnect = (reason: Socket.DisconnectReason) => {
    if (reason !== 'io client disconnect') setStatus(unreachable());
  };
  const onConnectError = () => setStatus(unreachable());
  const onOffline = () => setStatus('offline');
  const onOnline = () => {
    if (socket.connected) return;
    setStatus('reconnecting');
    socket.connect();
  };
  const onEvent = (type: string, payload: unknown) => {
    const parsed = RealtimeEventSchema.safeParse(payload);
    if (!parsed.success || parsed.data.type !== type) return;
    const event = parsed.data;
    const owner = event.userId;
    // Pedido sempre tem dono; evento de outro usuário (ou de pedido sem sessão) é descartado.
    if ((event.type === 'order.updated' || owner !== undefined) && owner !== userId) return;
    if (gate.accept(event)) bus.dispatch(event);
  };

  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  socket.on('connect_error', onConnectError);
  socket.onAny(onEvent);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  socket.connect();

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    socket.offAny(onEvent);
    socket.removeAllListeners();
    socket.disconnect();
  };
}

/**
 * Único ponto de entrada de eventos de tempo real. Um socket por sessão: trocar de usuário (ou
 * sair) fecha o socket anterior e abre outro com o novo token — eventos e versões não vazam
 * entre usuários. Cada evento é validado (zod), descartado se for de outro dono e filtrado pelo
 * gate (duplicado / versão antiga) antes de chegar aos `useRealtimeEvent`.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const session = useSession();
  const token = session?.token ?? null;
  const userId = session?.user.id ?? null;
  const [bus] = useState(createRealtimeBus);
  const [status, setStatus] = useState<ConnectionStatus>('reconnecting');

  useEffect(() => {
    let cancelled = false;
    let teardown: (() => void) | undefined;
    void createSocket(token).then((socket) => {
      if (!cancelled) teardown = wire(socket, { userId, queryClient, bus, setStatus });
    });
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [token, userId, queryClient, bus]);

  return (
    <RealtimeBusContext value={bus}>
      <RealtimeStatusContext value={status}>{children}</RealtimeStatusContext>
    </RealtimeBusContext>
  );
}
