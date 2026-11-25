const attemptKey = (userId: string) => `kurio:order-attempt:${userId}`;

type Attempt = { quoteId: string; key: string };

function read(userId: string): Attempt | null {
  try {
    const raw = sessionStorage.getItem(attemptKey(userId));
    const parsed = raw ? (JSON.parse(raw) as Partial<Attempt>) : null;
    return parsed && typeof parsed.quoteId === 'string' && typeof parsed.key === 'string'
      ? { quoteId: parsed.quoteId, key: parsed.key }
      : null;
  } catch {
    return null;
  }
}

/**
 * `Idempotency-Key` da tentativa de compra (ARCHITECTURE.md §6): gerada uma vez por cotação e guardada em
 * sessionStorage — reenvio, duplo clique e "Tentar novamente" usam a mesma. Cotação nova ou
 * pedido terminal (`clearAttemptKey`) começam outra tentativa.
 */
export function getOrCreateAttemptKey(userId: string, quoteId: string): string {
  const current = read(userId);
  if (current?.quoteId === quoteId) return current.key;
  const next: Attempt = { quoteId, key: crypto.randomUUID() };
  try {
    sessionStorage.setItem(attemptKey(userId), JSON.stringify(next));
  } catch {
    // Sem armazenamento: a chave vale só para esta tela.
  }
  return next.key;
}

export function clearAttemptKey(userId: string): void {
  try {
    sessionStorage.removeItem(attemptKey(userId));
  } catch {
    // Nada a limpar.
  }
}
