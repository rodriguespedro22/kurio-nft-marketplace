import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, test } from 'vitest';

import { ApiError, toApiError } from './api-error';

function axiosErrorWith(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response);
}

describe('toApiError', () => {
  test('lê o envelope de erro do servidor com campos', () => {
    const error = toApiError(
      axiosErrorWith(422, {
        error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', fields: { email: 'Inválido' } },
      }),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_ERROR', message: 'Dados inválidos' });
    expect(error.fields?.email).toBe('Inválido');
  });

  test('sem resposta → NETWORK', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(error).toMatchObject({ code: 'NETWORK', status: 0 });
  });

  test('timeout do axios → TIMEOUT', () => {
    expect(toApiError(new AxiosError('timeout of 8000ms exceeded', 'ECONNABORTED')).code).toBe('TIMEOUT');
    expect(toApiError(new AxiosError('timeout', 'ETIMEDOUT')).code).toBe('TIMEOUT');
  });

  test('resposta fora do envelope cai no código pelo status', () => {
    expect(toApiError(axiosErrorWith(503, 'Service Unavailable')).code).toBe('TRANSIENT');
    expect(toApiError(axiosErrorWith(404, null)).code).toBe('NOT_FOUND');
    expect(toApiError(axiosErrorWith(401, {})).code).toBe('UNAUTHENTICATED');
    expect(toApiError(axiosErrorWith(418, {})).code).toBe('UNKNOWN');
  });

  test('erro qualquer → UNKNOWN sem vazar a mensagem técnica', () => {
    const error = toApiError(new TypeError('cannot read properties of undefined'));
    expect(error.code).toBe('UNKNOWN');
    expect(error.message).not.toMatch(/cannot read/);
  });

  test('ApiError passa intacto', () => {
    const original = new ApiError({ status: 409, code: 'QUOTE_STALE', message: 'Cotação desatualizada' });
    expect(toApiError(original)).toBe(original);
  });
});
