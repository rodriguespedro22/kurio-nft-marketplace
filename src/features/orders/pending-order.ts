const pendingKey = (userId: string) => `kurio:pending-order:${userId}`;

/** Pedido em andamento do usuário (localStorage): reload e checkout voltam à tela de status. */
export function rememberPendingOrder(userId: string, orderId: string): void {
  try {
    localStorage.setItem(pendingKey(userId), orderId);
  } catch {
    // Sem armazenamento: a URL do pedido continua valendo.
  }
}

export function getPendingOrder(userId: string): string | null {
  try {
    return localStorage.getItem(pendingKey(userId));
  } catch {
    return null;
  }
}

/** Esquece o pedido — só se for o mesmo (outro pedido mais novo continua lembrado). */
export function clearPendingOrder(userId: string, orderId: string): void {
  try {
    if (localStorage.getItem(pendingKey(userId)) === orderId) localStorage.removeItem(pendingKey(userId));
  } catch {
    // Nada a limpar.
  }
}
