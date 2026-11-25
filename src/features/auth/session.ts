import { useSyncExternalStore } from 'react';
import { z } from 'zod';

import { UserSchema, type User } from '@/contracts';

/**
 * Sessão do cliente (ARCHITECTURE.md §4): token em localStorage (`kurio:session`) — o MSW não emite
 * cookie httpOnly de forma confiável (desvio documentado). Fonte única para header, guards,
 * Axios e, via `subscribeSession`, para o cache do Query e o socket.
 */
export const SESSION_STORAGE_KEY = 'kurio:session';
export const GUEST_CART_STORAGE_KEY = 'kurio:guest-cart';

const StoredSessionSchema = z.object({
  token: z.string().min(1),
  user: UserSchema,
  expiresAt: z.string().min(1),
});

export type Session = z.infer<typeof StoredSessionSchema>;
export type SignOutReason = 'logout' | 'expired' | 'switch';

type Listener = (next: Session | null, prev: Session | null) => void;

const listeners = new Set<Listener>();
let current: Session | null = readStorage();
let lastSignOutReason: SignOutReason | null = null;

function readStorage(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = StoredSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function emit(next: Session | null) {
  const prev = current;
  current = next;
  for (const listener of [...listeners]) listener(next, prev);
}

export function getSession(): Session | null {
  return current;
}

export function setSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Armazenamento indisponível (modo privado): a sessão vale só para esta aba.
  }
  lastSignOutReason = null;
  emit(session);
}

/** Perfil editado: troca o usuário da sessão atual (header e menu refletem na hora). */
export function updateSessionUser(user: User): void {
  if (current && current.user.id === user.id) setSession({ ...current, user });
}

export function clearSession(reason: SignOutReason): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  if (current) lastSignOutReason = reason;
  if (current !== null) emit(null);
}

/** Lê e esquece o motivo da última saída (o aviso "Sua sessão expirou" aparece uma vez). */
export function consumeSignOutReason(): SignOutReason | null {
  const reason = lastSignOutReason;
  lastSignOutReason = null;
  return reason;
}

/** Relê o localStorage (outra aba entrou/saiu) e notifica se mudou. */
export function reloadSessionFromStorage(): Session | null {
  const next = readStorage();
  if (next?.token !== current?.token) emit(next);
  else current = next;
  return next;
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isSessionExpired(session: Session): boolean {
  return Date.parse(session.expiresAt) <= Date.now();
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribeSession, getSession, getSession);
}

/** Id do carrinho de visitante — criado uma vez e reaproveitado (header `X-Guest-Cart`). */
export function getGuestCartId(): string {
  try {
    const existing = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(GUEST_CART_STORAGE_KEY, id);
    return id;
  } catch {
    guestCartFallback ??= crypto.randomUUID();
    return guestCartFallback;
  }
}
let guestCartFallback: string | undefined;

const AUTH_PAGES = /^\/(login|cadastro)(?:[/?#]|$)/;

/**
 * Destino pós-login vindo da URL: só caminhos internos (`/…`, nunca `//host`, `/\host` ou
 * esquema) e nunca as próprias telas de autenticação — evita open redirect e laço.
 */
export function safeRedirect(target: string | undefined | null): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return '/';
  if (AUTH_PAGES.test(target)) return '/';
  return target;
}

// Outra aba fez login/logout: acompanha para não enviar token velho.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_STORAGE_KEY || event.key === null) reloadSessionFromStorage();
  });
}
