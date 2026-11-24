/** Nome acessível do atalho do carrinho: "Carrinho" ou "Carrinho, 3 itens". */
export function cartShortcutLabel(count: number): string {
  if (count <= 0) return 'Carrinho';
  return `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`;
}

/** Identifica a linha para leitores de tela: "Ivory Baron #088 (edição 1/10)". */
export const cartLineName = (name: string, editionLabel: string) => `${name} (edição ${editionLabel})`;
