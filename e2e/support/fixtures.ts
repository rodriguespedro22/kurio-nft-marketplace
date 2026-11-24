import { test as base, expect } from '@playwright/test';

/**
 * `test` do projeto: falha qualquer teste em que a página lance um erro não tratado
 * (`pageerror`) — erros silenciosos no console não passam despercebidos.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors, 'erros não tratados na página').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
