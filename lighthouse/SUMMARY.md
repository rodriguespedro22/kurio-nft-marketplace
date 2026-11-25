# Lighthouse — Kurio (build de demo)

Gerado por `pnpm lighthouse` em 2026-11-25. Mediana de 3 rodadas por página e perfil,
cada uma num Chrome headless com perfil limpo, contra a publicação na Vercel (https://kurio-nft-marketplace-eight-theta.vercel.app),
com o build `--mode demo`, mocks MSW ligados, cenário padrão e painel de cenários visível (ele faz parte da demo).

| Página | Perfil | Performance (meta 90) | Acessibilidade (meta 95) | Boas práticas (meta 95) | SEO (meta 90) | LCP | CLS | TBT | LCP observado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 94 | 100 | 100 | 100 | 2.56 s | 0.005 | 103 ms | 3.02 s |
| Início | desktop | 97 | 100 | 100 | 100 | 0.57 s | 0.000 | 0 ms | 3.02 s |
| Detalhe (Ivory Baron #088) | mobile | 94 | 100 | 100 | 100 | 2.51 s | 0.013 | 93 ms | 3.00 s |
| Detalhe (Ivory Baron #088) | desktop | 97 | 100 | 100 | 100 | 0.56 s | 0.000 | 0 ms | 3.01 s |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. ⚠ = abaixo da meta.

## Abaixo da meta

Nenhuma.

## Otimizações e notas

**Onde medir.** O `vite preview` local serve gzip em HTTP/1.1; a Vercel serve Brotli em HTTP/2 a partir
da CDN. Com o mesmo build, a performance mobile medida localmente fica em ~84–86 e a da publicação passa de
90: menos bytes no caminho crítico e todos os chunks numa conexão só. Por isso a auditoria oficial roda contra
a URL publicada (`pnpm lighthouse --url=…`), que é o ambiente que o avaliador abre; `pnpm lighthouse` sem
`--url` continua medindo o build local. Na publicação, o "LCP observado" (sem throttling) inclui a abertura
da primeira conexão de cada Chrome recém-iniciado (~2 s até o 1º byte do HTML); o HTML em si sai do cache da
Vercel em ~0,3 s, e do 1º byte até o LCP passam ~0,7 s.

Corrigido na primeira auditoria: `robots.txt` (SEO 92 → 100), altura mínima do `<main>` (CLS do detalhe no
desktop 0,127 → 0), app e mocks baixando em paralelo, prioridade alta nas imagens da 1ª fileira do
catálogo e a lista de sufixos públicos (~250 KiB) fora do chunk dos mocks.

Na segunda rodada de otimização (comparação antes/depois na mesma máquina, rodadas intercaladas: mobile
83–84 → 84–86, LCP simulado 0,25–0,4 s menor):

- os chunks do boot (app e mocks) entram como `modulepreload` no HTML e baixam junto com o entry;
- menu da conta, popover da busca e menu mobile (Radix + Floating UI, ~16 KiB) carregam só na 1ª abertura,
  com pré-carga quando o navegador fica ocioso;
- o MSW testava cada requisição repassada pelo Service Worker (chunks, imagens, fontes) contra todos os
  ~40 handlers; agora o que não é da API sai no primeiro handler, e a compilação das rotas fica em cache;
- o cookie store do MSW (`tough-cookie`, sem uso: a sessão vai no header) saiu do bundle.

Testado sem ganho: zerar a latência simulada do mock (mesma nota), carregar o painel de cenários depois do
`load` (−2,5 KiB, sem efeito) e embutir a rota inicial no chunk principal (piorou: 81 → 77). Pré-carregar a
imagem do 1º card no HTML subiria a nota, mas só porque o cenário padrão é conhecido: seria uma
simplificação exclusiva para a auditoria, que o enunciado veda.

## Ambiente

- Alvo: https://kurio-nft-marketplace-eight-theta.vercel.app (publicação na Vercel, build `--mode demo`)
- Lighthouse 13.6.0 · Chrome 158.0.0.0 · Node v24.22.1
- SO: Windows_NT 10.0.26300 (x64) · CPU: 13th Gen Intel(R) Core(TM) i5-13420H (12 núcleos) · benchmarkIndex 3651
- Mobile: preset padrão do Lighthouse (Moto G Power), throttling simulado — RTT 150 ms, 1.6 Mbps, CPU 4× mais lenta
- Desktop: 1350×940, throttling simulado — RTT 40 ms, 10 Mbps, CPU 1×
- Relatórios (rodada de performance mediana): `lighthouse/reports/<página>-<perfil>.report.{html,json}`
