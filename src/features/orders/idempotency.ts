import type { CreateOrderInput } from '@/contracts';

const attemptKey = (userId: string) => `kurio:order-attempt:${userId}`;

/**
 * Tentativa de compra: `sent` = o pedido foi enviado e ainda não houve resposta definitiva (timeout
 * ou queda de rede — o servidor pode tê-lo criado); `settled` = houve resposta (pedido ou erro 4xx).
 */
type StoredAttempt = { key: string; input: CreateOrderInput; state: 'sent' | 'settled' };
export type Attempt = { key: string; input: CreateOrderInput };

function read(userId: string): StoredAttempt | null {
  try {
    const raw = sessionStorage.getItem(attemptKey(userId));
    const parsed = raw ? (JSON.parse(raw) as Partial<StoredAttempt>) : null;
    if (!parsed || typeof parsed.key !== 'string' || typeof parsed.input?.quoteId !== 'string') return null;
    return { key: parsed.key, input: parsed.input, state: parsed.state === 'sent' ? 'sent' : 'settled' };
  } catch {
    return null;
  }
}

function write(userId: string, attempt: StoredAttempt): void {
  try {
    sessionStorage.setItem(attemptKey(userId), JSON.stringify(attempt));
  } catch {
    // Sem armazenamento: a chave vale só para esta tela.
  }
}

/**
 * Começa (ou retoma) o envio do pedido com a `Idempotency-Key` da tentativa (ARCHITECTURE.md §6), guardada em
 * sessionStorage. Enquanto um envio não tiver resposta definitiva, todo reenvio — "Tentar novamente",
 * cotação refeita, reload — usa a **mesma chave e o mesmo corpo**: o servidor devolve o pedido que
 * talvez já exista, nunca cria um segundo. Depois de resolvida, a mesma cotação reusa a chave (duplo
 * clique) e uma cotação nova começa outra tentativa.
 */
export function beginAttempt(userId: string, input: CreateOrderInput): Attempt {
  const current = read(userId);
  if (current?.state === 'sent') return { key: current.key, input: current.input };
  const key = current?.input.quoteId === input.quoteId ? current.key : crypto.randomUUID();
  write(userId, { key, input, state: 'sent' });
  return { key, input };
}

/** Resposta definitiva do servidor (pedido criado ou recusado com 4xx): a tentativa deixa de estar no ar. */
export function settleAttempt(userId: string): void {
  const current = read(userId);
  if (current) write(userId, { ...current, state: 'settled' });
}

/** Envio sem resposta definitiva (ex.: a página recarregou durante o timeout) — o checkout o retoma. */
export function getUnsettledAttempt(userId: string): Attempt | null {
  const current = read(userId);
  return current?.state === 'sent' ? { key: current.key, input: current.input } : null;
}

export function clearAttemptKey(userId: string): void {
  try {
    sessionStorage.removeItem(attemptKey(userId));
  } catch {
    // Nada a limpar.
  }
}
