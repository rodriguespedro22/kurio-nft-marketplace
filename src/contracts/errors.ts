import { z } from 'zod';

/** Códigos que o servidor (mock) pode devolver no envelope de erro (ARCHITECTURE.md §2). */
export const SERVER_ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'AVAILABILITY_CONFLICT',
  'QUOTE_STALE',
  'IDEMPOTENCY_CONFLICT',
  'EMAIL_TAKEN',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'TRANSIENT',
] as const;

export const ServerErrorCodeSchema = z.enum(SERVER_ERROR_CODES);
export type ServerErrorCode = z.infer<typeof ServerErrorCodeSchema>;

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ServerErrorCodeSchema,
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
    details: z.unknown().optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
