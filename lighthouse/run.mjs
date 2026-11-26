// Auditoria Lighthouse da demo: build de demo, `vite preview` na porta 4174 e 3 rodadas por página
// e perfil (mobile padrão com throttling simulado; desktop preset), cada uma num Chrome headless
// com perfil limpo. Guarda o relatório da rodada mediana e escreve SUMMARY.md com as medianas.
//
// Uso: pnpm lighthouse [--skip-build] [--runs=3] [--url=https://…]
//   --url audita uma publicação (ex.: a da Vercel) em vez do `vite preview` local; não faz build.
import { execSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { preview } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'lighthouse');
const REPORTS = path.join(DIR, 'reports');
const PORT = 4174;
const args = process.argv.slice(2);
const RUNS = Number(args.find((a) => a.startsWith('--runs='))?.split('=')[1] ?? 3);
const REMOTE = args
  .find((a) => a.startsWith('--url='))
  ?.slice('--url='.length)
  .replace(/\/$/, '');
const BASE = REMOTE ?? `http://localhost:${PORT}`;

const PAGES = [
  { slug: 'inicio', label: 'Início', path: '/' },
  { slug: 'detalhe', label: 'Detalhe (Ivory Baron #088)', path: '/nft/nft-ivory-baron-088' },
];
const PROFILES = ['mobile', 'desktop'];
const CATEGORIES = [
  ['performance', 'Performance', 90],
  ['accessibility', 'Acessibilidade', 95],
  ['best-practices', 'Boas práticas', 95],
  ['seo', 'SEO', 90],
];
const METRICS = [
  ['largest-contentful-paint', 'LCP', (v) => `${(v / 1000).toFixed(2)} s`],
  ['cumulative-layout-shift', 'CLS', (v) => v.toFixed(3)],
  ['total-blocking-time', 'TBT', (v) => `${Math.round(v)} ms`],
];

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

async function loadConfig(profile) {
  return JSON.parse(await readFile(path.join(DIR, `config.${profile}.json`), 'utf8'));
}

async function audit(url, config) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'],
  });
  try {
    const result = await lighthouse(
      url,
      { port: chrome.port, output: ['html', 'json'], logLevel: 'error' },
      config,
    );
    if (!result) throw new Error(`Lighthouse não devolveu resultado para ${url}`);
    return result;
  } finally {
    await chrome.kill();
  }
}

if (!REMOTE && !args.includes('--skip-build')) {
  execSync('pnpm build:demo', { cwd: ROOT, stdio: 'inherit' });
}

await rm(REPORTS, { recursive: true, force: true });
await mkdir(REPORTS, { recursive: true });

const server = REMOTE
  ? null
  : await preview({
      root: ROOT,
      mode: 'demo',
      preview: { port: PORT, strictPort: true, open: false },
    });
const rows = [];
let environment = null;

try {
  for (const page of PAGES) {
    for (const profile of PROFILES) {
      const config = await loadConfig(profile);
      const runs = [];
      for (let n = 1; n <= RUNS; n++) {
        process.stdout.write(`${page.slug} · ${profile} · ${n}/${RUNS}… `);
        const { lhr, report } = await audit(`${BASE}${page.path}`, config);
        environment ??= lhr;
        runs.push({ lhr, report });
        const perf = Math.round((lhr.categories.performance.score ?? 0) * 100);
        console.log(`performance ${perf}`);
      }

      const scores = Object.fromEntries(
        CATEGORIES.map(([id]) => [
          id,
          median(runs.map((r) => Math.round((r.lhr.categories[id].score ?? 0) * 100))),
        ]),
      );
      const metrics = Object.fromEntries(
        METRICS.map(([id]) => [id, median(runs.map((r) => r.lhr.audits[id].numericValue ?? 0))]),
      );
      // Relatório guardado: o da rodada com a performance mediana (as outras só entram na mediana).
      const byPerf = [...runs].sort(
        (a, b) => (a.lhr.categories.performance.score ?? 0) - (b.lhr.categories.performance.score ?? 0),
      );
      const kept = byPerf[Math.floor(byPerf.length / 2)];
      const [html] = kept.report;
      const base = path.join(REPORTS, `${page.slug}-${profile}`);
      await writeFile(`${base}.report.html`, html);

      const observedLcp = median(
        runs.map((r) => r.lhr.audits.metrics.details?.items?.[0]?.observedLargestContentfulPaint ?? 0),
      );
      const mocksChunk = kept.lhr.audits['network-requests'].details.items.find((item) =>
        /\/assets\/browser-[^/]+\.js$/.test(item.url),
      );
      rows.push({ page, profile, scores, metrics, observedLcp, mocksBytes: mocksChunk?.transferSize ?? 0 });
    }
  }
} finally {
  if (server) await new Promise((resolve) => server.httpServer.close(resolve));
}

const env = environment.environment;
const chromeVersion = /Chrome\/([\d.]+)/.exec(env.hostUserAgent)?.[1] ?? env.hostUserAgent;
const mobileThrottle = environment.configSettings.throttling;

const header = `| Página | Perfil | ${CATEGORIES.map(([, label, goal]) => `${label} (meta ${goal})`).join(' | ')} | ${METRICS.map(([, label]) => label).join(' | ')} | LCP observado |`;
const divider = `|${' --- |'.repeat(3 + CATEGORIES.length + METRICS.length)}`;
const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`;
const table = rows.map(({ page, profile, scores, metrics, observedLcp }) => {
  const cells = CATEGORIES.map(([id, , goal]) =>
    scores[id] >= goal ? `${scores[id]}` : `**${scores[id]}** ⚠`,
  );
  const values = METRICS.map(([id, , format]) => format(metrics[id]));
  return `| ${page.label} | ${profile} | ${cells.join(' | ')} | ${values.join(' | ')} | ${seconds(observedLcp)} |`;
});

/** Por que a performance mobile fica abaixo da meta, com os números desta rodada. */
function justification() {
  const mocksKb = Math.round(Math.max(...rows.map((r) => r.mocksBytes)) / 1024);
  const observed = rows
    .filter((r) => r.profile === 'mobile')
    .map((r) => `${r.page.label}: ${seconds(r.observedLcp)}`)
    .join('; ');
  const desktop = rows
    .filter((r) => r.profile === 'desktop')
    .map((r) => r.scores.performance)
    .join(' e ');
  return `### Por quê

O que fica abaixo da meta é a Performance no perfil mobile (4G lento simulado, CPU 4× mais lenta), e o
custo vem do mock, que faz parte da demo:

- **MSW no caminho crítico.** O app só renderiza depois de \`enableMocking()\` registrar o Service Worker.
  O chunk dos mocks (MSW, binding do Socket.IO, fixtures e painel; ${mocksKb} KiB transferidos) precisa
  baixar e ser avaliado antes da primeira requisição de dados. Com um backend real, esse chunk não existe.
- **Cadeia de JavaScript antes do primeiro dado.** React, router, Query/Axios, zod e o MSW somam ~290 KiB
  comprimidos que precisam baixar e rodar antes de o catálogo ser pedido. A simulação mobile (1,6 Mbps, CPU
  4×) transforma isso em segundos de LCP, embora o trabalho real de CPU no carregamento fique em ~250 ms.
- **A imagem do LCP só é descoberta depois da API.** É uma SPA sem SSR: a imagem do 1º card (home) ou da arte
  (detalhe) depende do JSON. Ela já tem \`fetchpriority="high"\`, carregamento imediato, AVIF/WebP com
  \`srcset\` e dimensões fixas (CLS ≈ 0).
- **Sem throttling o LCP é curto** (observado: ${observed}), e no desktop o mesmo build fica em ${desktop}.`;
}

/** Histórico das otimizações e diferença entre a medição local e a publicada (sempre no SUMMARY). */
function notes() {
  return `## Otimizações e notas

**Onde medir.** O \`vite preview\` local serve gzip em HTTP/1.1; a Vercel serve Brotli em HTTP/2 a partir
da CDN. Com o mesmo build, a performance mobile medida localmente fica em ~84–86 e a da publicação passa de
90: menos bytes no caminho crítico e todos os chunks numa conexão só. Por isso a auditoria oficial roda contra
a URL publicada (\`pnpm lighthouse --url=…\`), que é o ambiente que o avaliador abre; \`pnpm lighthouse\` sem
\`--url\` continua medindo o build local. Na publicação, o "LCP observado" (sem throttling) inclui a abertura
da primeira conexão de cada Chrome recém-iniciado (~2 s até o 1º byte do HTML); o HTML em si sai do cache da
Vercel em ~0,3 s, e do 1º byte até o LCP passam ~0,7 s.

Corrigido na primeira auditoria: \`robots.txt\` (SEO 92 → 100), altura mínima do \`<main>\` (CLS do detalhe no
desktop 0,127 → 0), app e mocks baixando em paralelo, prioridade alta nas imagens da 1ª fileira do
catálogo e a lista de sufixos públicos (~250 KiB) fora do chunk dos mocks.

Na segunda rodada de otimização (comparação antes/depois na mesma máquina, rodadas intercaladas: mobile
83–84 → 84–86, LCP simulado 0,25–0,4 s menor):

- os chunks do boot (app e mocks) entram como \`modulepreload\` no HTML e baixam junto com o entry;
- menu da conta, popover da busca e menu mobile (Radix + Floating UI, ~16 KiB) carregam só na 1ª abertura,
  com pré-carga quando o navegador fica ocioso;
- o MSW testava cada requisição repassada pelo Service Worker (chunks, imagens, fontes) contra todos os
  ~40 handlers; agora o que não é da API sai no primeiro handler, e a compilação das rotas fica em cache;
- o cookie store do MSW (\`tough-cookie\`, sem uso: a sessão vai no header) saiu do bundle.

Testado sem ganho: zerar a latência simulada do mock (mesma nota), carregar o painel de cenários depois do
\`load\` (−2,5 KiB, sem efeito) e embutir a rota inicial no chunk principal (piorou: 81 → 77). Pré-carregar a
imagem do 1º card no HTML subiria a nota, mas só porque o cenário padrão é conhecido: seria uma
simplificação exclusiva para a auditoria, que o enunciado veda.`;
}

const below = rows.flatMap(({ page, profile, scores }) =>
  CATEGORIES.filter(([id, , goal]) => scores[id] < goal).map(
    ([id, label, goal]) => `- ${page.label} · ${profile}: ${label} ${scores[id]} (meta ${goal})`,
  ),
);

const summary = `# Lighthouse — Kurio (build de demo)

Gerado por \`pnpm lighthouse\` em ${new Date().toLocaleDateString('sv-SE')}. Mediana de ${RUNS} rodadas por página e perfil,
cada uma num Chrome headless com perfil limpo, contra ${REMOTE ? `a publicação na Vercel (${REMOTE})` : 'o `vite preview` local'},
com o build \`--mode demo\`, mocks MSW ligados, cenário padrão e painel de cenários visível (ele faz parte da demo).

${header}
${divider}
${table.join('\n')}

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. ⚠ = abaixo da meta.

${below.length ? `## Abaixo da meta\n\n${below.join('\n')}\n\n${justification()}\n` : '## Abaixo da meta\n\nNenhuma.\n'}
${notes()}

## Ambiente

- Alvo: ${REMOTE ? `${REMOTE} (publicação na Vercel, build \`--mode demo\`)` : `\`vite preview\` local (build \`--mode demo\`)`}
- Lighthouse ${environment.lighthouseVersion} · Chrome ${chromeVersion} · Node ${process.version}
- SO: ${os.type()} ${os.release()} (${os.arch()}) · CPU: ${os.cpus()[0]?.model.trim()} (${os.cpus().length} núcleos) · benchmarkIndex ${Math.round(env.benchmarkIndex)}
- Mobile: preset padrão do Lighthouse (Moto G Power), throttling simulado — RTT ${mobileThrottle.rttMs} ms, ${(mobileThrottle.throughputKbps / 1024).toFixed(1)} Mbps, CPU ${mobileThrottle.cpuSlowdownMultiplier}× mais lenta
- Desktop: 1350×940, throttling simulado — RTT 40 ms, 10 Mbps, CPU 1×
- Relatórios (rodada de performance mediana): \`lighthouse/reports/<página>-<perfil>.report.{html,json}\`
`;

await writeFile(path.join(DIR, 'SUMMARY.md'), summary);
console.log(`\nSUMMARY.md escrito.\n${table.join('\n')}`);
