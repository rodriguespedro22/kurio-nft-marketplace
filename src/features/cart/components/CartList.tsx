import type { CartItem } from '@/contracts';

import { CART_COLUMNS } from '../layout';
import { CartLine } from './CartLine';

type CartListProps = {
  items: CartItem[];
  /** Linha `index` saiu: a página leva o foco para a próxima (ou para o título se esvaziou). */
  onRemoved: (index: number) => void;
};

/** Cabeçalho visual (só desktop; cada célula tem rótulo próprio para leitores de tela) + linhas. */
export function CartList({ items, onRemoved }: CartListProps) {
  return (
    <div className="flex flex-col gap-3">
      <div
        aria-hidden="true"
        className={`hidden border-b border-border pb-3 text-body font-bold text-foreground md:grid md:gap-x-4 ${CART_COLUMNS}`}
      >
        <span className="md:[grid-column:1/3]">NFTs</span>
        <span className="[grid-area:price]">Preço</span>
        <span className="[grid-area:qty]">Edições</span>
        <span className="[grid-area:total]">Total</span>
      </div>
      <ul aria-label="Itens do carrinho" className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={item.id}>
            <CartLine item={item} onRemoved={() => onRemoved(index)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
