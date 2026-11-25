/**
 * Substitui o `tough-cookie` no bundle. O MSW só o usa no seu cookie store (`msw/lib/core/utils/
 * cookieStore`): lê cookies da requisição e guarda os `Set-Cookie` das respostas mockadas. Os mocks
 * não usam cookies (a sessão vai no header `Authorization`), então o store fica sempre vazio. Sem
 * isto, ~70 KB de JavaScript entram no chunk dos mocks, que está no caminho crítico da demo.
 */
type CookieIndex = Record<string, Record<string, Record<string, Cookie>>>;

export class Cookie {
  domain: string | null = null;
  path: string | null = null;
  key = '';

  static fromJSON(): Cookie | null {
    return null;
  }

  toJSON(): Record<string, unknown> {
    return {};
  }
}

export class MemoryCookieStore {
  idx: CookieIndex = {};
}

export class CookieJar {
  constructor(_store?: MemoryCookieStore) {}

  getCookiesSync(_url: string): Cookie[] {
    return [];
  }

  async setCookie(_cookie: unknown, _url: string): Promise<void> {}
}
