import { toSocketIo } from '@mswjs/socket.io-binding';
import { ws, type WebSocketHandlerConnection } from 'msw';

import type { NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from '@/contracts';

import type { MockDb } from '../db/schema';
import { db } from '../db/store';

/**
 * Servidor Socket.IO simulado (ARCHITECTURE.md §9) sobre o binding do MSW — só transporte websocket.
 * O binding responde ao handshake (Engine.IO `0` + CONNECT `40`); aqui ficam o resto: ping para
 * o cliente não derrubar a conexão, o `auth.token` do CONNECT do cliente → `userId`, e a entrega
 * dos eventos (pedido só para os sockets do dono).
 */
const SOCKET_PATH = (import.meta.env.VITE_SOCKET_PATH || '/socket.io').replace(/\/$/, '');
/**
 * O `ws.link` do MSW remove `/socket.io/` da URL antes de comparar (a URL limpa fica igual à do
 * HMR do Vite) e, havendo qualquer handler de websocket, nenhuma conexão passa direto. Por isso:
 * casa tudo e filtra pela URL original; o que não é do Socket.IO segue para o servidor real.
 */
const link = ws.link('*');
const isSocketIo = (url: URL) => url.pathname.startsWith(`${SOCKET_PATH}/`);

/** O binding anuncia pingInterval 25 s + pingTimeout 5 s: sem ping em 30 s o cliente reconecta. */
const PING_INTERVAL_MS = 20_000;

type Peer = {
  connection: WebSocketHandlerConnection;
  io: ReturnType<typeof toSocketIo>;
  userId: string | null;
  ping: ReturnType<typeof setInterval>;
};

const peers = new Set<Peer>();

/** Token válido (sessão existente e não vencida) → usuário; qualquer outro caso → anônimo. */
function userIdForToken(token: unknown): string | null {
  if (typeof token !== 'string' || !token) return null;
  const session = db.get().sessions.find((s) => s.token === token);
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null;
  return session.userId;
}

/** CONNECT do cliente no namespace `/`: `40{"token":"..."}` (payload de `auth`). */
function readAuthToken(raw: unknown): unknown {
  if (typeof raw !== 'string' || !raw.startsWith('40')) return undefined;
  try {
    return (JSON.parse(raw.slice(2) || '{}') as { token?: unknown }).token;
  } catch {
    return undefined;
  }
}

export const socketHandlers = [
  link.addEventListener('connection', (connection) => {
    const { client } = connection;
    if (!isSocketIo(client.url)) {
      connection.server.connect();
      return;
    }
    // Rede simulada fora do ar: recusa — o cliente segue tentando com backoff.
    if (db.get().meta.network === 'offline') {
      client.close();
      return;
    }

    const peer: Peer = {
      connection,
      io: toSocketIo(connection),
      userId: null,
      ping: setInterval(() => client.send('2'), PING_INTERVAL_MS),
    };
    peers.add(peer);

    client.addEventListener('message', (event) => {
      const token = readAuthToken(event.data);
      if (token !== undefined) peer.userId = userIdForToken(token);
    });
    client.addEventListener('close', () => {
      clearInterval(peer.ping);
      peers.delete(peer);
    });
  }),
];

function send(peer: Peer, event: RealtimeEvent): void {
  peer.io.client.emit(event.type, event);
}

/** Roda `fn` dentro de `db.update` e devolve o resultado. */
function mutate<T>(fn: (d: MockDb) => T): T {
  let result!: T;
  db.update((d) => {
    result = fn(d);
  });
  return result;
}

const nextEventId = (d: MockDb) => {
  d.eventSeq += 1;
  return `evt-${d.eventSeq}`;
};

/**
 * Lê o NFT atual do banco, incrementa a versão (a mesma que o REST devolve) e emite
 * `nft.updated` para todos os sockets. Chame depois de gravar a mudança no banco.
 */
export function emitNftUpdated(nftId: string): NftUpdatedEvent | null {
  const event = mutate((d): NftUpdatedEvent | null => {
    const nft = d.nfts.find((n) => n.id === nftId);
    if (!nft) return null;
    nft.version += 1;
    return {
      eventId: nextEventId(d),
      type: 'nft.updated',
      resource: { type: 'nft', id: nft.id },
      version: nft.version,
      occurredAt: new Date().toISOString(),
      data: {
        editions: nft.editions.map(({ id, price, available }) => ({ id, price, available })),
        status: nft.status,
      },
    };
  });
  if (event) for (const peer of peers) send(peer, event);
  return event;
}

/** Como `emitNftUpdated`, para pedidos — entregue só aos sockets autenticados como o dono. */
export function emitOrderUpdated(orderId: string): OrderUpdatedEvent | null {
  const event = mutate((d): OrderUpdatedEvent | null => {
    const order = d.orders[orderId];
    if (!order) return null;
    order.version += 1;
    return {
      eventId: nextEventId(d),
      type: 'order.updated',
      resource: { type: 'order', id: order.id },
      version: order.version,
      occurredAt: new Date().toISOString(),
      userId: order.userId,
      data: {
        status: order.status,
        txHash: order.txHash,
        rejectionReason: order.rejectionReason,
        explorerUrl: order.explorerUrl,
      },
    };
  });
  if (event) {
    for (const peer of peers) if (peer.userId === event.userId) send(peer, event);
  }
  return event;
}

/** Derruba todas as conexões (testes de reconexão). O cliente reconecta sozinho. */
export function dropAllSockets(): number {
  const all = [...peers];
  for (const peer of all) peer.connection.client.close();
  return all.length;
}
