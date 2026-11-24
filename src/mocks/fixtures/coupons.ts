export type CouponFixture = {
  code: string;
  percent: number;
  status: 'active' | 'expired';
};

/** `KURIO10` válido (10% do subtotal); `EXPIRADO10` expirado; qualquer outro é inválido. */
export const COUPONS: Record<string, CouponFixture> = {
  KURIO10: { code: 'KURIO10', percent: 10, status: 'active' },
  EXPIRADO10: { code: 'EXPIRADO10', percent: 10, status: 'expired' },
};
