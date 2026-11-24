import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '@/shared/api/api-error';

/**
 * Leva os erros por campo da API (`error.fields`) para o formulário e devolve a mensagem
 * geral quando não há campo conhecido para mostrá-la. O primeiro campo recebe foco.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): string | null {
  const apiError = error instanceof ApiError ? error : null;
  if (!apiError) return 'Algo deu errado. Tente novamente.';

  let focused = false;
  let applied = false;
  for (const [name, message] of Object.entries(apiError.fields ?? {})) {
    if (!knownFields.includes(name as Path<T>)) continue;
    setError(name as Path<T>, { type: 'server', message }, { shouldFocus: !focused });
    focused = true;
    applied = true;
  }
  return applied ? null : apiError.message;
}
