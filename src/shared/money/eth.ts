import Big, { type Big as BigValue } from 'big.js';

/** Valor em ETH como string decimal (`^\d+(\.\d{1,18})?$` no transporte). Nunca `number`. */
export type Eth = string;

const ETH_DECIMALS = 18;

// Construtor próprio para não alterar a configuração global de quem mais usar big.js.
const EthBig = Big();
EthBig.DP = ETH_DECIMALS;
EthBig.RM = EthBig.roundHalfUp;

const toBig = (value: Eth): BigValue => new EthBig(value);

/** Notação normal (nunca exponencial), sem zeros à direita, no máximo 18 casas. */
const toEth = (value: BigValue): Eth => {
  const rounded = value.round(ETH_DECIMALS);
  return rounded.eq(0) ? '0' : rounded.toFixed();
};

export function addEth(...values: Eth[]): Eth {
  return toEth(values.reduce<BigValue>((sum, v) => sum.plus(toBig(v)), new EthBig(0)));
}

export function subEth(a: Eth, b: Eth): Eth {
  return toEth(toBig(a).minus(toBig(b)));
}

export function mulEth(a: Eth, quantity: number): Eth {
  if (!Number.isInteger(quantity)) throw new RangeError(`Quantidade deve ser inteira: ${quantity}`);
  return toEth(toBig(a).times(quantity));
}

export function pctEth(a: Eth, percent: number): Eth {
  return toEth(toBig(a).times(percent).div(100));
}

export function cmpEth(a: Eth, b: Eth): -1 | 0 | 1 {
  return toBig(a).cmp(toBig(b));
}

type FormatOptions = {
  /** Arredonda (meio para cima) para no máximo N casas. */
  maxDecimals?: number;
  /** Completa com zeros até N casas (padrão 2, como os preços do layout). */
  minDecimals?: number;
};

/** `26.846` → `"26.846 ETH"`; `0` → `"0.00 ETH"`. */
export function formatEth(value: Eth, { maxDecimals, minDecimals = 2 }: FormatOptions = {}): string {
  let amount = toBig(value);
  if (maxDecimals !== undefined) amount = amount.round(maxDecimals, EthBig.roundHalfUp);

  const [integer = '0', fraction = ''] = toEth(amount).split('.');
  const minimum = maxDecimals === undefined ? minDecimals : Math.min(minDecimals, maxDecimals);
  const decimals = fraction.padEnd(minimum, '0');

  return `${integer}${decimals ? `.${decimals}` : ''} ETH`;
}
