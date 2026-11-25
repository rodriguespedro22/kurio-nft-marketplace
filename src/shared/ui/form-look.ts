import { cn } from '@/shared/lib/utils';

/**
 * Formulários densos (pagamento, perfil, carteiras): rótulo 15 px, asterisco coral grande colado ao
 * rótulo, controles de 40 px com canto de 3 px. Aplicado no `<form>`, vale para todos os campos.
 */
export const DENSE_FIELDS = cn(
  '[&_[data-slot=form-field]>div:first-child>label]:text-body [&_[data-slot=form-field]>div:first-child>label]:leading-[15px] [&_[data-slot=form-field]>div:first-child>label]:font-normal',
  '[&_[data-slot=form-field]>div:first-child]:min-h-[29px] [&_[data-slot=form-field]>div:first-child>span]:text-[1.375rem] [&_[data-slot=form-field]>div:first-child>span]:leading-[29px]',
  '[&_[data-slot=form-field]>p]:mt-1.5',
  '[&_input]:rounded-[3px] [&_input:not([type=checkbox])]:h-10 [&_select]:h-10 [&_select]:rounded-[3px] [&_textarea]:rounded-[3px]',
);

/** Título de seção desses formulários (17 px, negrito). */
/** Campos com o rótulo colado ao controle (pagamento, carteiras, senha). */
export const TIGHT_LABELS = '[&_[data-slot=form-field]]:gap-0';

export const FORM_TITLE = 'text-[1.0625rem] leading-4 font-bold text-foreground';
