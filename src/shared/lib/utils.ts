import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// O tailwind-merge precisa conhecer as escalas customizadas do tema; sem isso ele trata
// `text-body` (tamanho) e `text-foreground` (cor) como conflitantes e descarta um deles.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display',
        'h1',
        'h2',
        'title',
        'title-sm',
        'section',
        'body-lg',
        'body',
        'body-sm',
        'caption',
        'micro',
      ],
      radius: ['control', 'field', 'art'],
      shadow: ['bar'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
