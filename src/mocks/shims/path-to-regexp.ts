/**
 * O MSW compila o caminho de cada handler com `match()` a cada requisição interceptada, inclusive
 * imagens e chunks (o Service Worker repassa tudo para a página decidir). Com ~40 handlers, isso
 * vira milhares de compilações iguais no boot da demo. Aqui `match()` guarda a função compilada
 * por caminho; o resultado é o mesmo, só não é recalculado. Ligado no vite.config (só para o MSW).
 */
import { match as compile, type MatchFunction, type Path } from 'path-to-regexp';

export * from 'path-to-regexp';

type MatchOptions = Parameters<typeof compile>[1];

const cache = new Map<string, MatchFunction<object>>();

export function match<P extends object = object>(path: Path, options?: MatchOptions): MatchFunction<P> {
  // O MSW sempre chama com um caminho em texto e `{ decode: decodeURIComponent }`; o resto não é cacheado.
  const cacheable =
    typeof path === 'string' &&
    options !== undefined &&
    Object.keys(options).length === 1 &&
    options.decode === decodeURIComponent;
  if (!cacheable) return compile<P>(path, options);

  let fn = cache.get(path);
  if (!fn) {
    fn = compile<object>(path, options);
    cache.set(path, fn);
  }
  return fn as MatchFunction<P>;
}
