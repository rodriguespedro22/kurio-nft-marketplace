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
/** `dropAllSockets(holdMs)`: até este instante, novas conexões são recusadas. */
let refuseUntil = 0;
/** Último evento emitido — `replayLast()` o reenvia com o mesmo `eventId`. */
let lastEmitted: RealtimeEvent | null = null;

export type EmitResult<E extends RealtimeEvent = RealtimeEvent> = { event: E | null; delivered: number };

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
    // Rede simulada fora do ar (ou queda forçada): falha como uma conexão recusada — `error` e
    // depois `close`. Só `close` antes do handshake deixaria o socket.io preso em "opening".
    if (db.get().meta.network === 'offline' || Date.now() < refuseUntil) {
      // `socket` existe em runtime (o próprio MSW o usa para conexões sem handler), mas não no tipo.
      (client as unknown as { socket: WebSocket }).socket.dispatchEvent(new Event('error'));
      client.close(1011, 'unavailable');
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

/** Envia aos sockets que passam no filtro; pedidos só aos do dono. Devolve quantos receberam. */
function deliver(event: RealtimeEvent): number {
  lastEmitted = event;
  let delivered = 0;
  for (const peer of peers) {
    if (event.type === 'order.updated' && peer.userId !== event.userId) continue;
    peer.io.client.emit(event.type, event);
    delivered += 1;
  }
  return delivered;
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
export function emitNftUpdated(nftId: string): EmitResult<NftUpdatedEvent> {
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
  return { event, delivered: event ? deliver(event) : 0 };
}

/** Como `emitNftUpdated`, para pedidos — entregue só aos sockets autenticados como o dono. */
export function emitOrderUpdated(orderId: string): EmitResult<OrderUpdatedEvent> {
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
  return { event, delivered: event ? deliver(event) : 0 };
}

/** Reentrega o último evento (mesmo `eventId`) — o cliente deve ignorá-lo. */
export function replayLast(): EmitResult {
  if (!lastEmitted) return { event: null, delivered: 0 };
  return { event: lastEmitted, delivered: deliver(lastEmitted) };
}

/**
 * Evento atrasado: versão anterior à atual do NFT, com preço 0.01 em todas as edições. Não muda
 * o banco — simula uma mensagem antiga chegando fora de ordem.
 */
export function emitStaleNft(nftId: string): EmitResult<NftUpdatedEvent> {
  const event = mutate((d): NftUpdatedEvent | null => {
    const nft = d.nfts.find((n) => n.id === nftId);
    if (!nft) return null;
    return {
      eventId: nextEventId(d),
      type: 'nft.updated',
      resource: { type: 'nft', id: nft.id },
      version: Math.max(0, nft.version - 1),
      occurredAt: new Date().toISOString(),
      data: {
        editions: nft.editions.map(({ id, available }) => ({ id, price: '0.01', available })),
        status: nft.status,
      },
    };
  });
  return { event, delivered: event ? deliver(event) : 0 };
}

/** `order.updated` atrasado: status `pending` com versão anterior à atual. Não muda o banco. */
export function emitStaleOrder(orderId: string): EmitResult<OrderUpdatedEvent> {
  const event = mutate((d): OrderUpdatedEvent | null => {
    const order = d.orders[orderId];
    if (!order) return null;
    return {
      eventId: nextEventId(d),
      type: 'order.updated',
      resource: { type: 'order', id: order.id },
      version: Math.max(0, order.version - 1),
      occurredAt: new Date().toISOString(),
      userId: order.userId,
      data: { status: 'pending', txHash: null, rejectionReason: null, explorerUrl: null },
    };
  });
  return { event, delivered: event ? deliver(event) : 0 };
}

/**
 * Derruba todas as conexões (testes de reconexão); com `holdMs`, recusa reconexões por esse
 * tempo. Os sockets saem da lista na hora: nada emitido depois disso chega até reconectarem.
 */
export function dropAllSockets(holdMs = 0): number {
  const all = [...peers];
  refuseUntil = Date.now() + holdMs;
  for (const peer of all) {
    clearInterval(peer.ping);
    peers.delete(peer);
    peer.connection.client.close();
  }
  return all.length;
}

/** Conexões abertas (testes esperam o socket da página antes de emitir). */
export function socketState() {
  return { connections: [...peers].map((peer) => ({ userId: peer.userId })) };
}
