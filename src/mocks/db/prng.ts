export type Prng = {
  /** Número em [0, 1). */
  next(): number;
  /** Inteiro em [min, max] (inclusivo). */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(probability: number): boolean;
};

/** Mulberry32: PRNG pequeno e determinístico para fixtures, delays e cenários. */
export function createPrng(seed: number): Prng {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new RangeError('pick() em lista vazia');
      return items[Math.floor(next() * items.length)] as T;
    },
    chance: (probability) => next() < probability,
  };
}
