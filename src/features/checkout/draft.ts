import { z } from 'zod';

import { NetworkSchema, WalletProviderSchema } from '@/contracts';
import { CHECKOUT_DRAFT_PREFIX } from '@/features/auth/sign-out';

import type { BuyerFormValues } from './schema';

export type CheckoutDraft = { walletId: string | null; buyer: Partial<BuyerFormValues> };

const text = z.string().max(500).optional().catch(undefined);

/** Cada campo é validado sozinho: um valor estranho some, o resto do rascunho fica. */
const DraftBuyerSchema = z.object({
  displayName: text,
  username: text,
  network: NetworkSchema.optional().catch(undefined),
  profileName: text,
  walletAddress: text,
  secondaryWalletOrEns: text,
  walletType: WalletProviderSchema.optional().catch(undefined),
  referralCode: text,
  email: text,
  ensName: text,
  useOtherWallet: z.boolean().optional().catch(undefined),
  notes: text,
});

const DraftSchema = z.object({
  walletId: z.string().nullable().catch(null),
  buyer: DraftBuyerSchema.catch({}),
});

/** Sob o prefixo que o logout limpa (`signOutLocal`); a sessão expirada o mantém. */
const draftKey = (userId: string) => `${CHECKOUT_DRAFT_PREFIX}${userId}:draft`;

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * Rascunho do checkout em sessionStorage, por usuário: sobrevive ao reload e ao login depois de
 * uma sessão expirada. Só dados do formulário (nenhum é senha ou segredo).
 */
export function saveCheckoutDraft(userId: string, draft: CheckoutDraft): void {
  try {
    sessionStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch {
    // Armazenamento cheio ou bloqueado: o checkout segue sem rascunho.
  }
}

export function loadCheckoutDraft(userId: string): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = DraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return { walletId: parsed.data.walletId, buyer: withoutUndefined(parsed.data.buyer) };
  } catch {
    return null;
  }
}

export function clearCheckoutDraft(userId: string): void {
  try {
    sessionStorage.removeItem(draftKey(userId));
  } catch {
    // Sem acesso ao armazenamento: nada a limpar.
  }
}
