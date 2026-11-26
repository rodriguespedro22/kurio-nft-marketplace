import { createFileRoute } from '@tanstack/react-router';

import { CheckoutPage } from '@/features/checkout/components/CheckoutPage';

export const Route = createFileRoute('/_auth/checkout')({
  staticData: { hidePhoneNav: true },
  component: CheckoutPage,
});
