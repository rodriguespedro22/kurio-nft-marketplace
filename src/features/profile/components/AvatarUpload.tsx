import { useId, useRef, useState, type ChangeEvent } from 'react';
import { CircleAlert, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from '@/contracts';
import { ApiError } from '@/shared/api/api-error';
import { Button } from '@/shared/ui/button';

import { useRemoveAvatar, useUploadAvatar } from '../queries';

const TOO_BIG = 'A imagem deve ter até 2 MB.';
const WRONG_TYPE = 'Use uma imagem PNG, JPEG ou WebP.';

/** Mensagem da API para o campo `avatar` (o servidor valida tipo e tamanho de novo). */
function uploadError(error: unknown): string {
  if (error instanceof ApiError) return error.fields?.avatar ?? error.message;
  return 'Não foi possível enviar a imagem. Tente novamente.';
}

/**
 * Avatar: círculo + "Alterar" / "Remover". Tipo e tamanho são checados antes do
 * envio (`multipart/form-data`); a imagem salva vem da API.
 */
export function AvatarUpload({ avatarUrl }: { avatarUrl: string | null }) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const [error, setError] = useState<string | null>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) return setError(WRONG_TYPE);
    if (file.size > AVATAR_MAX_BYTES) return setError(TOO_BIG);
    upload.mutate(file, {
      onSuccess: () => toast.success('Avatar atualizado'),
      onError: (failure) => setError(uploadError(failure)),
    });
  }

  function handleRemove() {
    setError(null);
    remove.mutate(undefined, {
      onSuccess: () => toast.success('Avatar removido'),
      onError: () => setError('Não foi possível remover o avatar. Tente novamente.'),
    });
  }

  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-col gap-2">
      <p id={titleId} className="text-body-sm font-medium text-foreground">
        Avatar
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="grid size-12.5 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-raised">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Seu avatar" className="size-full object-cover" />
          ) : (
            <ImageIcon aria-hidden="true" className="size-6 text-accent" strokeWidth={1.5} />
          )}
        </div>
        <Button
          size="sm"
          className="h-10 px-6"
          loading={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          Alterar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-10"
          disabled={!avatarUrl}
          loading={remove.isPending}
          onClick={handleRemove}
        >
          Remover
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_MIME_TYPES.join(',')}
          aria-label="Escolher imagem do avatar"
          tabIndex={-1}
          className="sr-only"
          onChange={handleFile}
        />
      </div>
      <p className="text-caption text-muted">PNG, JPEG ou WebP, até 2 MB.</p>
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-caption text-coral">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
