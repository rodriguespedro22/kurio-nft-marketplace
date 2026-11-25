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
        className={`hidden border-b border-primary/30 pr-6 pb-3 text-body-lg leading-4 text-foreground md:grid ${CART_COLUMNS}`}
      >
        <span className="font-bold md:[grid-column:1/3]">NFTs</span>
        <span className="font-medium [grid-area:price]">Preço</span>
        <span className="font-bold [grid-area:qty]">Edições</span>
        <span className="font-medium [grid-area:total]">Total</span>
      </div>
      <ul aria-label="Itens do carrinho" className="flex flex-col gap-5 md:gap-3">
        {items.map((item, index) => (
          <li key={item.id}>
            <CartLine item={item} onRemoved={() => onRemoved(index)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
