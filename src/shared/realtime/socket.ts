import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

/** Caminho do Socket.IO na mesma origem do app (no demo, interceptado pelo MSW). */
export const SOCKET_PATH = (import.meta.env.VITE_SOCKET_PATH || '/socket.io').replace(/\/$/, '');

/**
 * Só websocket (o binding do MSW não simula long-polling); `auth.token` identifica o dono. Criado
 * sem conectar: quem chama registra os listeners e depois `socket.connect()`.
 *
 * Import dinâmico de propósito: o engine.io guarda o construtor do `WebSocket` quando o módulo
 * carrega. Carregado depois do `enableMocking()`, usa o WebSocket interceptado pelo MSW — e
 * ainda sai do bundle inicial.
 */
export async function createSocket(token: string | null): Promise<Socket> {
  const { io } = await import('socket.io-client');
  return io(window.location.origin, {
    path: SOCKET_PATH,
    transports: ['websocket'],
    auth: token ? { token } : {},
    autoConnect: false,
  });
}

const PUBLIC_ROOTS = new Set(['catalog', 'featured', 'nft']);
const PRIVATE_KINDS = new Set(['cart', 'quote', 'order']);

/** Dados que eventos mantêm atualizados — os que podem ter mudado enquanto o socket esteve fora. */
export function isRealtimeBacked(queryKey: QueryKey): boolean {
  const [root, , kind] = queryKey;
  if (typeof root !== 'string') return false;
  if (PUBLIC_ROOTS.has(root)) return true;
  return (root === 'user' || root === 'guest') && typeof kind === 'string' && PRIVATE_KINDS.has(kind);
}

/** Ao reconectar: eventos perdidos são recuperados pelo REST, só nas queries em uso. */
export function refreshAfterReconnect(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => isRealtimeBacked(query.queryKey),
    refetchType: 'active',
  });
}
