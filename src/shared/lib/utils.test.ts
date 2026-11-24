import { expect, test } from 'vitest';

import { cn } from './utils';

test('cn mantém tamanho de texto customizado e cor juntos', () => {
  expect(cn('text-body', 'text-foreground')).toBe('text-body text-foreground');
});

test('cn resolve conflito entre tamanhos de texto customizados', () => {
  expect(cn('text-body', 'text-h1')).toBe('text-h1');
});

test('cn resolve conflito entre raios customizados', () => {
  expect(cn('rounded-field', 'rounded-art')).toBe('rounded-art');
});
