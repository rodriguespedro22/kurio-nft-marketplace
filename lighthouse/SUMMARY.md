# Lighthouse — Kurio (build de demo)

Gerado por `pnpm lighthouse` em 2026-11-25. Mediana de 3 rodadas por página e perfil,
cada uma num Chrome headless com perfil limpo, contra `vite preview` (build `--mode demo`, mocks MSW ligados,
painel de cenários visível — ele faz parte da demo).

| Página | Perfil | Performance (meta 90) | Acessibilidade (meta 95) | Boas práticas (meta 95) | SEO (meta 90) | LCP | CLS | TBT | LCP observado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | **84** ⚠ | 100 | 100 | 100 | 4.47 s | 0.005 | 91 ms | 0.49 s |
| Início | desktop | 99 | 100 | 100 | 100 | 0.99 s | 0.000 | 0 ms | 0.32 s |
| Detalhe (Ivory Baron #088) | mobile | **85** ⚠ | 100 | 100 | 100 | 4.34 s | 0.013 | 100 ms | 0.47 s |
| Detalhe (Ivory Baron #088) | desktop | 98 | 100 | 100 | 100 | 1.10 s | 0.000 | 0 ms | 0.45 s |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. ⚠ = abaixo da meta.

## Abaixo da meta

- Início · mobile: Performance 84 (meta 90)
- Detalhe (Ivory Baron #088) · mobile: Performance 85 (meta 90)

### Por quê

O que fica abaixo da meta é a Performance no perfil mobile (4G lento simulado, CPU 4× mais lenta), e o
custo vem do mock, que faz parte da demo:

- **MSW no caminho crítico.** O app só renderiza depois de `enableMocking()` registrar o Service Worker.
  O chunk dos mocks (MSW, binding do Socket.IO, fixtures e painel; 65 KiB transferidos) precisa
  baixar e ser avaliado antes da primeira requisição de dados. Com um backend real, esse chunk não existe.
- **Cadeia de JavaScript antes do primeiro dado.** React, router, Query/Axios, zod e o MSW somam ~290 KiB
  comprimidos que precisam baixar e rodar antes de o catálogo ser pedido. A simulação mobile (1,6 Mbps, CPU
  4×) transforma isso em segundos de LCP, embora o trabalho real de CPU no carregamento fique em ~250 ms.
- **A imagem do LCP só é descoberta depois da API.** É uma SPA sem SSR: a imagem do 1º card (home) ou da arte
  (detalhe) depende do JSON. Ela já tem `fetchpriority="high"`, carregamento imediato, AVIF/WebP com
  `srcset` e dimensões fixas (CLS ≈ 0).
- **Sem throttling o LCP é curto** (observado: Início: 0.49 s; Detalhe (Ivory Baron #088): 0.47 s), e no desktop o mesmo build fica em 99 e 98.

Corrigido nesta auditoria: `robots.txt` (SEO 92 → 100), altura mínima do `<main>` (CLS do detalhe no
desktop 0,127 → 0), app e mocks baixando em paralelo, prioridade alta nas imagens da 1ª fileira do
catálogo e a lista de sufixos públicos (~250 KiB) fora do chunk dos mocks.

Testado sem ganho: zerar a latência simulada do mock (mesma nota), carregar o painel de cenários depois do
`load` (−2,5 KiB, sem efeito) e embutir a rota inicial no chunk principal (piorou: 81 → 77). Pré-carregar a
imagem do 1º card no HTML subiria a nota, mas só porque o cenário padrão é conhecido: seria uma
simplificação exclusiva para a auditoria, que o enunciado veda.

## Ambiente

- Lighthouse 13.6.0 · Chrome 158.0.0.0 · Node v24.22.1
- SO: Windows_NT 10.0.26300 (x64) · CPU: 13th Gen Intel(R) Core(TM) i5-13420H (12 núcleos) · benchmarkIndex 3764
- Mobile: preset padrão do Lighthouse (Moto G Power), throttling simulado — RTT 150 ms, 1.6 Mbps, CPU 4× mais lenta
- Desktop: 1350×940, throttling simulado — RTT 40 ms, 10 Mbps, CPU 1×
- Relatórios (rodada de performance mediana): `lighthouse/reports/<página>-<perfil>.report.{html,json}`
