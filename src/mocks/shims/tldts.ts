/**
 * Substitui o `tldts` no bundle do navegador. O MSW o recebe via `tough-cookie`, que só chama
 * `getDomain` para descobrir o domínio registrável de um cookie com atributo `Domain`. Os mocks não
 * usam cookies (a sessão vai no header), e a lista pública de sufixos completa custaria ~250 KB de
 * JavaScript no caminho crítico da demo. Aqui: IP e `localhost` valem como estão; o resto fica com
 * os dois últimos rótulos.
 */
export function getDomain(hostname: string): string | null {
  const host = hostname.replace(/\.$/, '').toLowerCase();
  if (!host) return null;
  if (host === 'localhost' || /^[\d.]+$/.test(host) || host.includes(':')) return host;
  const labels = host.split('.');
  return labels.length < 2 ? null : labels.slice(-2).join('.');
}
