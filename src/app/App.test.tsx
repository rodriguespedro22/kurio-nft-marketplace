import { render } from '@testing-library/react';
import { expect, test } from 'vitest';

import { App } from './App';

test('App renderiza sem lançar erros', () => {
  expect(() => render(<App />)).not.toThrow();
});
