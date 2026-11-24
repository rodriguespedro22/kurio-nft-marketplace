import { z } from 'zod';

import { PASSWORDS_DONT_MATCH, PasswordSchema, UserSchema } from './auth';
import {
  DisplayNameSchema,
  EmailSchema,
  EnsNameSchema,
  REQUIRED,
  UsernameSchema,
  WalletLabelSchema,
} from './common';

/** Frame Perfil do colecionador. */
export const ProfileSchema = UserSchema.extend({
  ensName: z.string().nullable(),
  walletLabel: z.string().nullable(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** `PATCH /me` */
export const UpdateProfileInputSchema = z.object({
  displayName: DisplayNameSchema,
  username: UsernameSchema,
  email: EmailSchema,
  ensName: EnsNameSchema,
  walletLabel: WalletLabelSchema,
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

/** `POST /me/avatar` (multipart, campo `avatar`). */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

const ChangePasswordBaseSchema = z.object({
  currentPassword: z.string(REQUIRED).min(1, REQUIRED),
  newPassword: PasswordSchema,
  confirmPassword: z.string(REQUIRED).min(1, REQUIRED),
});

/** `POST /me/password` */
export const ChangePasswordInputSchema = ChangePasswordBaseSchema.refine(
  (d) => d.newPassword === d.confirmPassword,
  {
    path: ['confirmPassword'],
    message: PASSWORDS_DONT_MATCH,
    when: (payload) =>
      ChangePasswordBaseSchema.pick({ newPassword: true, confirmPassword: true }).safeParse(payload.value)
        .success,
  },
);
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;
