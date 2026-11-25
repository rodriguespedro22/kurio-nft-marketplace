import { z } from 'zod';

/** Search de `/login` e `/cadastro`: destino pós-login e motivo do redirecionamento. */
export const AuthSearchSchema = z.object({
  redirect: z.string().max(2048).optional().catch(undefined),
  motivo: z.enum(['expirada', 'senha']).optional().catch(undefined),
});

export type AuthSearch = z.infer<typeof AuthSearchSchema>;

export const PASSWORD_CHANGED_NOTICE = 'Senha alterada. Entre com a nova senha.';

export const SESSION_EXPIRED_NOTICE = 'Sua sessão expirou. Entre novamente para continuar.';
