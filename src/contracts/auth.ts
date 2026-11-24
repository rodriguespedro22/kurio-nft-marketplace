import { z } from 'zod';

import { EmailSchema, IdSchema, IsoDateTimeSchema, REQUIRED, UsernameSchema } from './common';

export const UserSchema = z.object({
  id: IdSchema,
  email: z.email(),
  displayName: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
});
export type User = z.infer<typeof UserSchema>;

export const AuthResponseSchema = z.object({
  token: z.string().min(1),
  user: UserSchema,
  expiresAt: IsoDateTimeSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/** `GET /auth/session` — recupera a sessão do token atual após refresh. */
export const SessionInfoSchema = z.object({
  user: UserSchema,
  expiresAt: IsoDateTimeSchema,
});
export type SessionInfo = z.infer<typeof SessionInfoSchema>;

export const PasswordSchema = z
  .string(REQUIRED)
  .min(1, REQUIRED)
  .min(8, 'Use pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'Inclua uma letra maiúscula')
  .regex(/\d/, 'Inclua um número')
  .regex(/[^A-Za-z0-9]/, 'Inclua um símbolo');

export const PASSWORDS_DONT_MATCH = 'As senhas não coincidem';

export const LoginInputSchema = z.object({
  email: EmailSchema,
  password: z.string(REQUIRED).min(1, REQUIRED),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

const RegisterBaseSchema = z.object({
  username: UsernameSchema,
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: z.string(REQUIRED).min(1, REQUIRED),
});

/** Campos do frame Cadastro; nome de exibição nasce igual ao usuário. */
export const RegisterInputSchema = RegisterBaseSchema.refine((d) => d.password === d.confirmPassword, {
  path: ['confirmPassword'],
  message: PASSWORDS_DONT_MATCH,
  // Roda mesmo com outros campos inválidos, para mostrar todos os erros de uma vez.
  when: (payload) =>
    RegisterBaseSchema.pick({ password: true, confirmPassword: true }).safeParse(payload.value).success,
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;
