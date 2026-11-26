# Kurio — Marketplace de NFTs

SPA de marketplace de NFTs (catálogo, detalhe, favoritos, carrinho, checkout com carteira, pedidos, perfil e
carteiras) construída a partir do layout do desafio. O backend inteiro é simulado no navegador por **MSW**
(REST) e por um **Socket.IO interceptado** (tempo real), com cenários de falha reproduzíveis.

Stack: Vite 8 · React 19 · TypeScript 6 · TanStack Router e Query 5 · Axios · zod 4 · react-hook-form ·
Tailwind v4 · shadcn/ui (Radix) · sonner · MSW 2 + `@mswjs/socket.io-binding` · socket.io-client · Vitest · Playwright.

Decisões de arquitetura, contratos e estratégias de sincronização: [ARCHITECTURE.md](ARCHITECTURE.md).

**Demo publicada:** https://kurio-nft-marketplace-eight-theta.vercel.app (mocks e tempo real ligados; o
painel "Cenários", no canto inferior esquerdo, troca o cenário e o perfil de rede).

## Como usar a demo

1. **Explore o catálogo** na página inicial: busque, filtre por categoria e preço, ordene e pagine.
2. **Abra um NFT** para ver a galeria, escolher a edição e a quantidade, favoritar ou comprar.
3. **Monte o carrinho** mesmo sem login. Ao entrar, os itens continuam lá. O cupom `KURIO10` dá 10% de desconto.
4. **Entre** com `colecionador@kurio.test` / `Kurio@2026` (ou crie uma conta em /cadastro).
5. **Finalize a compra:** escolha a carteira e a rede, revise preço e estoque e confirme. O pedido mostra o
   status de pendente até confirmado.
6. **Gerencie perfil e carteiras** em /perfil e /carteiras.
7. **Teste as falhas** pelo painel "Cenários": rede lenta, erros do servidor, sessão expirada, mudanças de
   preço e estoque em tempo real.

## Requisitos

- **Node ≥ 22**
- **pnpm 10** (o `packageManager` do `package.json` fixa a versão; com Corepack: `corepack enable`)
- Para os testes E2E: Chromium do Playwright (`pnpm exec playwright install chromium`)
- Para regerar as baselines visuais localmente: Docker com o daemon rodando (opcional, há alternativa em CI)

## Começando

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

Não é preciso criar `.env`: `.env.development` e `.env.demo` já vêm versionados com os mocks ligados. Para
sobrescrever, copie `.env.example` para `.env.local`.

| Variável            | Padrão       | Função                                                                                            |
| ------------------- | ------------ | ------------------------------------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | `true`       | Liga MSW (REST + Socket.IO) e o painel de cenários. Sem ela, nada de `src/mocks` entra no bundle. |
| `VITE_API_URL`      | `/api`       | Base da API REST (relativa ou absoluta).                                                          |
| `VITE_SOCKET_PATH`  | `/socket.io` | Caminho do Socket.IO (mesma origem).                                                              |

### Credenciais fictícias

| Usuário                   | Senha        | Estado inicial                                     |
| ------------------------- | ------------ | -------------------------------------------------- |
| `colecionador@kurio.test` | `Kurio@2026` | Carteira principal MetaMask cadastrada e conectada |
| `ana@kurio.test`          | `Kurio@2026` | Sem carteiras (bom para testar o cadastro)         |

Também é possível criar uma conta em **/cadastro**: ela vive só no banco do mock (localStorage do navegador).

### Cupons

| Código       | Resultado                   |
| ------------ | --------------------------- |
| `KURIO10`    | 10% de desconto no subtotal |
| `EXPIRADO10` | Recusado: cupom expirado    |
| outro        | Recusado: cupom inválido    |

## Cenários e rede simulada

O mock guarda o banco em `localStorage` (`kurio:mockdb:v1`, seed determinístico). Cada cenário restaura o
banco do zero e ajusta o comportamento do servidor.

**Como escolher um cenário:**

1. **Painel de cenários**: botão flutuante **Cenários** no canto inferior esquerdo, em qualquer página. Trocar o
   cenário reseta os dados e recarrega. Ali também ficam o perfil de rede e os gatilhos **Alterar preço** (+10%
   na 1ª edição disponível do NFT aberto), **Esgotar edição**, **Derrubar socket** e **Resetar dados**.
   Para esconder o painel (capturas de tela): `?panel=0`.
2. **URL**: `/?scenario=payment-declined` (vale no carregamento; fica salvo em `kurio:mock:boot`).
3. **API de controle** (a mesma que os testes usam), por exemplo no console do navegador:

   ```js
   await fetch('/api/__mock/reset', { method: 'POST', body: JSON.stringify({ scenario: 'slow-network' }) });
   ```

| Endpoint (todos `POST`, salvo indicação)                      | Efeito                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| `/__mock/reset` `{ scenario? }`                               | Restaura o banco e aplica o cenário (padrão: `default`) |
| `/__mock/network` `{ profile }`                               | Troca o perfil de rede                                  |
| `/__mock/session/expire`                                      | Expira a sessão atual no servidor                       |
| `/__mock/nfts/:id/update` `{ editionId, price?, available? }` | Altera preço/estoque **e** emite `nft.updated`          |
| `/__mock/socket/drop`                                         | Derruba as conexões Socket.IO (o cliente reconecta)     |
| `/__mock/socket/replay-last`                                  | Reenvia o último evento (testa deduplicação)            |
| `/__mock/socket/emit-stale`, `/emit-stale-order`              | Emite evento com versão antiga (testa descarte)         |
| `GET /__mock/state`, `GET /__mock/socket`                     | Estado atual (cenário, rede, conexões)                  |

**Cenários:**

| Cenário                        | O que acontece                                                         |
| ------------------------------ | ---------------------------------------------------------------------- |
| `default`                      | Catálogo completo, rede normal (150–400 ms)                            |
| `empty-catalog`                | Nenhum NFT listado                                                     |
| `slow-network`                 | Toda resposta demora ~2,5 s                                            |
| `out-of-order`                 | Buscas seguidas respondem na ordem inversa                             |
| `server-errors`                | Leituras do catálogo respondem 503                                     |
| `session-expired`              | Tokens expiram 60 s após o login                                       |
| `register-conflict`            | Cadastro recusa o nome de usuário (409)                                |
| `coupon-invalid`               | Todo cupom é recusado                                                  |
| `price-change-during-checkout` | O preço do 1º item sobe no 1º envio do pedido (`409 QUOTE_STALE`)      |
| `sold-out-during-checkout`     | O 1º item esgota no 1º envio do pedido (`409 QUOTE_STALE`)             |
| `order-timeout-idempotent`     | A 1ª resposta de `POST /orders` atrasa 12 s (o cliente desiste em 8 s) |
| `payment-confirmed`            | Pedidos confirmam após 4 s                                             |
| `payment-declined`             | Pedidos são recusados e a carteira recusa conexão                      |

**Perfis de rede:** `normal` (150–400 ms), `slow` (2,5 s), `jitter` (100–3000 ms, semeado e reproduzível),
`offline` (falha de rede), `flaky` (503 intermitente), `timeout-orders` (`POST /orders` em 12 s),
`server-errors` (503 no catálogo).

### Reproduzindo cada falha

Em todos os roteiros, "entrar" = login com `colecionador@kurio.test` / `Kurio@2026`.

1. **Sucesso e vazio**: `default` mostra o catálogo; `empty-catalog` mostra o estado vazio. Uma busca sem
   resultado (ex.: `zzz`) no `default` mostra o vazio de busca com "Limpar filtros".
2. **Latência variável e fora de ordem**: em `slow-network`, recarregue o Início e veja os skeletons; no
   perfil de rede `jitter`, filtre várias vezes seguidas. Em `out-of-order`, busque um termo e, em menos de 1 s,
   outro (Enter envia na hora): a resposta antiga chega depois e é descartada; o grid fica com a última busca.
3. **Falha de conexão e 4xx/5xx**: em `server-errors`, o grid mostra "Instabilidade temporária" com **Tentar
   novamente** (troque a rede para `normal` no painel e clique). Com o perfil `offline`, favoritar ou mudar a
   quantidade no carrinho desfaz a ação otimista e avisa. `/nft/nao-existe` mostra o 404.
4. **Sessão expirada e não autorizado**: entre, vá ao checkout, preencha parte do formulário e use
   `POST /__mock/session/expire` (ou o cenário `session-expired` e espere 60 s). Na próxima requisição o app
   leva ao login com aviso; depois de entrar, volta ao checkout com o rascunho preservado. Abrir `/perfil` sem
   sessão leva ao login com `redirect`. Sem permissão (403): entre como `colecionador@kurio.test`, faça uma compra,
   copie a URL `/pedido/…`, saia, entre como `ana@kurio.test` e abra a URL: "Este pedido é de outra conta".
5. **Conflito no cadastro e validação**: em `register-conflict`, cadastre-se: o erro 409 aparece no campo
   nome de usuário. Cadastrar `ana@kurio.test` mostra "e-mail já cadastrado" em qualquer cenário. Campos
   inválidos mostram a mensagem junto do campo.
6. **Cupom inválido ou expirado**: no carrinho, aplique `EXPIRADO10` ou `XYZ`; no cenário `coupon-invalid`
   até `KURIO10` é recusado.
7. **Preço alterado ou edição esgotada durante a compra**: em `price-change-during-checkout` (ou
   `sold-out-during-checkout`), entre, adicione um NFT, vá ao checkout, preencha e clique **Confirmar compra**.
   O servidor responde `QUOTE_STALE` com a nova cotação; o diálogo mostra antes/depois e exige **Confirmar
   novo total** (ou remover o item esgotado). Sem cenário, o mesmo efeito vem de **Alterar preço** /
   **Esgotar edição** no painel com o checkout aberto.
8. **Timeout após criar o pedido**: em `order-timeout-idempotent`, confirme a compra. O cliente desiste em
   8 s, mostra "Verificando seu pedido…" e oferece **Tentar novamente**; o reenvio usa a mesma
   `Idempotency-Key` e recebe o mesmo pedido, sem duplicar. Se a página recarregar antes da resposta, voltar
   ao checkout reenvia a mesma tentativa e leva ao mesmo pedido (um só no banco).
9. **Pagamento confirmado ou recusado**: `payment-confirmed` leva à tela de status, que vira "Pedido
   confirmado" com recibo em ~4 s (por `order.updated` no socket). `payment-declined` mostra a recusa com o
   motivo e mantém o carrinho; conectar uma carteira em /carteiras também é recusado.

**Tempo real**: com o detalhe de um NFT aberto em duas abas, **Alterar preço** no painel atualiza as duas.
**Derrubar socket** corta a conexão; ao reconectar, o app revalida pelo REST o que estiver na tela (e, sem
socket, um pedido pendente passa a ser consultado a cada 5 s).

## Comandos

| Comando                        | O que faz                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `pnpm dev`                     | Servidor de desenvolvimento (mocks ligados)                                                  |
| `pnpm build`                   | Typecheck + build de produção (`.env.production`, se existir; sem ele, mocks desligados)     |
| `pnpm build:demo`              | Build com `--mode demo` (mocks e painel ligados), o que vai para a Vercel                    |
| `pnpm preview`                 | Serve o último build                                                                         |
| `pnpm typecheck`               | `tsc` sem emitir                                                                             |
| `pnpm lint`                    | ESLint                                                                                       |
| `pnpm format` / `format:check` | Prettier                                                                                     |
| `pnpm test:unit`               | Vitest (contratos, mocks, hooks e componentes; `test:unit:watch` em modo watch)              |
| `pnpm test:e2e`                | Playwright: faz `build:demo`, sobe `vite preview` e roda desktop, mobile e smoke de tablet   |
| `pnpm test:e2e:ui`             | Playwright em modo UI                                                                        |
| `pnpm test:visual`             | Regressão visual no container Docker do Playwright (compara com as baselines versionadas)    |
| `pnpm test:visual:update`      | Regera as baselines visuais no mesmo container                                               |
| `pnpm lighthouse`              | Auditoria Lighthouse (3 rodadas × Início/Detalhe × mobile/desktop) → `lighthouse/SUMMARY.md` |

### Testes E2E

`e2e/00-shell` a `e2e/12-loading-recovery` cobrem os itens do enunciado (catálogo, detalhe, autenticação,
favoritos, carrinho, compra, falhas de pagamento, conta, tempo real no checkout, resiliência do socket,
teclado/acessibilidade com axe e carregamento/recuperação). Cada teste começa com `/__mock/reset` num
contexto novo. Relatório HTML em `playwright-report/`, trace guardado nas falhas.

**Regressão visual** (`e2e/visual.spec.ts`: Início, Detalhe, Carrinho e Checkout × desktop/mobile): as
baselines ficam versionadas em `e2e/__screenshots__/` e são **Linux**, o mesmo render do container do
Playwright usado no CI. No Linux (e no CI) elas rodam junto com `pnpm test:e2e`; em outros sistemas os testes
visuais são pulados no `test:e2e` e rodam pelo Docker:

- `pnpm test:visual` compara com as baselines no container `mcr.microsoft.com/playwright` da mesma versão do
  `@playwright/test`;
- `pnpm test:visual:update` regera as baselines no mesmo container;
- sem Docker: rode o workflow **CI** manualmente com `visual_baselines` marcado e baixe o artefato
  `visual-baselines` para `e2e/__screenshots__/`.

Se o `npm` dentro do container falhar com `ECONNRESET` no handshake TLS (algumas redes do Docker Desktop
derrubam o ClientHello do Node 26), rode com `NODE_OPTIONS=--tls-max-v1.2`; o script repassa a variável.

### Lighthouse

`pnpm lighthouse` grava os relatórios da rodada mediana em `lighthouse/reports/` e o resumo em
[lighthouse/SUMMARY.md](lighthouse/SUMMARY.md). Sem argumentos, faz o build de demo e audita o `vite preview`
local (`--skip-build` reaproveita o build); com `--url=…`, audita uma publicação.

A auditoria versionada é a da demo publicada (`pnpm lighthouse --url=https://kurio-nft-marketplace-eight-theta.vercel.app`):
Performance 94 no mobile e 97 no desktop, nas duas páginas; Acessibilidade, Boas práticas e SEO em 100. No
`vite preview` local o mobile fica em ~84–86, porque ele serve gzip em HTTP/1.1, e a Vercel, Brotli em HTTP/2
(detalhes no resumo). A nota mobile também depende da carga da máquina, porque a simulação usa o tempo de CPU
observado: rode a auditoria com a máquina ociosa.

## CI

`.github/workflows/ci.yml`: typecheck, lint e unit; depois E2E no container do Playwright (relatório como
artefato). O job de baselines visuais só roda manualmente.

## Estrutura

```
src/
  app/          providers, QueryClient, router, ligação da sessão
  routes/       rotas do TanStack Router (code splitting automático)
  features/     auth, catalog, nft, favorites, cart, checkout, orders, profile, wallets, account, realtime-sync
  shared/       api (Axios + erros), realtime (socket, porta de eventos), ui, layout, money, lib
  contracts/    schemas zod de requests, respostas e eventos (compartilhados por app e mock)
  mocks/        banco em memória, fixtures, handlers MSW, servidor Socket.IO, cenários, rede, painel
e2e/            Playwright (specs, suporte, baselines visuais)
lighthouse/     script, configs, relatórios e resumo
scripts/        regressão visual no container do Playwright
```
