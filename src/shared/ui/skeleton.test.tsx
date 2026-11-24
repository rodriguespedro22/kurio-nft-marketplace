import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { Skeleton } from './skeleton';

test('Skeleton fica oculto para leitores de tela', () => {
  render(<Skeleton data-testid="skeleton" />);
  expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true');
});

test('Skeleton usa shimmer e o desliga com movimento reduzido', () => {
  render(<Skeleton data-testid="skeleton" className="h-4 w-20" />);
  const node = screen.getByTestId('skeleton');
  expect(node).toHaveClass('animate-shimmer', 'motion-reduce:animate-none', 'h-4', 'w-20');
});
