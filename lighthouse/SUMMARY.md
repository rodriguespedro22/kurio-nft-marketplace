# Lighthouse — Kurio (build de demo)

Gerado por `pnpm lighthouse` em 2026-11-24. Mediana de 3 rodadas por página e perfil,
cada uma num Chrome headless com perfil limpo, contra `vite preview` (build `--mode demo`, mocks MSW ligados,
painel de cenários visível — ele faz parte da demo).

| Página | Perfil | Performance (meta 90) | Acessibilidade (meta 95) | Boas práticas (meta 95) | SEO (meta 90) | LCP | CLS | TBT | LCP observado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | **80** ⚠ | 100 | 100 | 100 | 5.05 s | 0.005 | 129 ms | 0.49 s |
| Início | desktop | 98 | 100 | 100 | 100 | 1.15 s | 0.000 | 0 ms | 0.43 s |
| Detalhe (Ivory Baron #088) | mobile | **81** ⚠ | 100 | 100 | 100 | 5.00 s | 0.012 | 123 ms | 0.57 s |
| Detalhe (Ivory Baron #088) | desktop | 98 | 100 | 100 | 100 | 1.15 s | 0.000 | 0 ms | 0.52 s |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. ⚠ = abaixo da meta.

## Abaixo da meta

- Início · mobile: Performance 80 (meta 90)
- Detalhe (Ivory Baron #088) · mobile: Performance 81 (meta 90)

### Por quê

O que fica abaixo da meta é a Performance no perfil mobile (4G lento simulado, CPU 4× mais lenta), e o
custo vem do mock, que faz parte da demo:

- **MSW no caminho crítico.** O app só renderiza depois de `enableMocking()` registrar o Service Worker.
  O chunk dos mocks (MSW, binding do Socket.IO, fixtures e painel; 175 KiB transferidos) precisa
  baixar e ser avaliado antes da primeira requisição de dados. Com um backend real, esse chunk não existe.
- **Latência simulada de propósito.** O perfil de rede `normal` do mock responde em 150–400 ms, e o
  Lighthouse soma esse tempo de servidor à simulação.
- **A imagem do LCP só é descoberta depois da API.** É uma SPA sem SSR: a imagem do 1º card (home) ou da arte
  (detalhe) depende do JSON. Ela já tem `fetchpriority="high"`, carregamento imediato, AVIF/WebP com
  `srcset` e dimensões fixas (CLS ≈ 0).
- **Sem throttling o LCP é curto** (observado: Início: 0.49 s; Detalhe (Ivory Baron #088): 0.57 s), e no desktop o mesmo build fica em 98 e 98.

Corrigido nesta auditoria: `robots.txt` (SEO 92 → 100), altura mínima do `<main>` (CLS do detalhe no
desktop 0,127 → 0), app e mocks baixando em paralelo, e prioridade alta nas imagens da 1ª fileira do
catálogo.

## Ambiente

- Lighthouse 13.6.0 · Chrome 158.0.0.0 · Node v24.22.1
- SO: Windows_NT 10.0.26300 (x64) · CPU: 13th Gen Intel(R) Core(TM) i5-13420H (12 núcleos) · benchmarkIndex 3488
- Mobile: preset padrão do Lighthouse (Moto G Power), throttling simulado — RTT 150 ms, 1.6 Mbps, CPU 4× mais lenta
- Desktop: 1350×940, throttling simulado — RTT 40 ms, 10 Mbps, CPU 1×
- Relatórios (rodada de performance mediana): `lighthouse/reports/<página>-<perfil>.report.{html,json}`
