import { isAxiosError } from 'axios';

import { ErrorEnvelopeSchema, type ServerErrorCode } from '@/contracts';

export type ApiErrorCode = ServerErrorCode | 'NETWORK' | 'TIMEOUT' | 'UNKNOWN';

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  BAD_REQUEST: 'Requisição inválida.',
  VALIDATION_ERROR: 'Verifique os campos destacados.',
  UNAUTHENTICATED: 'Entre na sua conta para continuar.',
  SESSION_EXPIRED: 'Sua sessão expirou. Entre novamente.',
  FORBIDDEN: 'Você não tem permissão para esta ação.',
  NOT_FOUND: 'Não encontramos o que você procurava.',
  CONFLICT: 'Não foi possível concluir a ação.',
  AVAILABILITY_CONFLICT: 'Quantidade indisponível.',
  QUOTE_STALE: 'Os valores mudaram. Revise o pedido.',
  IDEMPOTENCY_CONFLICT: 'Este pedido já foi enviado com outros dados.',
  EMAIL_TAKEN: 'E-mail já cadastrado.',
  COUPON_INVALID: 'Cupom inválido.',
  COUPON_EXPIRED: 'Cupom expirado.',
  TRANSIENT: 'Serviço temporariamente indisponível. Tente novamente.',
  NETWORK: 'Sem conexão com o servidor.',
  TIMEOUT: 'O servidor demorou demais para responder.',
  UNKNOWN: 'Algo deu errado. Tente novamente.',
};

type ApiErrorInit = {
  status: number;
  code: ApiErrorCode;
  message?: string;
  fields?: Record<string, string>;
  details?: unknown;
  cause?: unknown;
};

/** Erro único da camada de API: mensagem sempre pronta para a UI (pt-BR), nunca técnica. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields?: Record<string, string>;
  readonly details?: unknown;

  constructor({ status, code, message, fields, details, cause }: ApiErrorInit) {
    super(message ?? DEFAULT_MESSAGES[code], { cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
  }
}

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'VALIDATION_ERROR';
  if (status >= 500) return 'TRANSIENT';
  return 'UNKNOWN';
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ status: 0, code: 'TIMEOUT', cause: error });
    }
    if (!error.response) {
      return new ApiError({ status: 0, code: 'NETWORK', cause: error });
    }

    const { status, data } = error.response;
    const envelope = ErrorEnvelopeSchema.safeParse(data);
    if (envelope.success) {
      const { code, message, fields, details } = envelope.data.error;
      return new ApiError({ status, code, message, fields, details, cause: error });
    }
    return new ApiError({ status, code: codeFromStatus(status), cause: error });
  }

  return new ApiError({ status: 0, code: 'UNKNOWN', cause: error });
}
