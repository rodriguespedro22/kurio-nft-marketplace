# Arquitetura — Kurio

Este documento descreve os contratos entre front e "servidor" (simulado), as estratégias de cache,
sincronização e reconciliação, o transporte em tempo real, as decisões de UX e os desvios do layout.
Como rodar e reproduzir cada cenário: [README.md](README.md).

## 1. Visão geral

```
UI (rotas + features) ──▶ hooks de Query/mutations ──▶ api.ts (Axios + validação zod) ──▶ /api/*
        ▲                         ▲                                                       │
        │                  setQueryData /                                            MSW (Service Worker)
        │                  invalidateQueries                                              │
        │                         │                                                       ▼
 RealtimeSync ◀── porta de eventos ◀── socket.io-client ◀── ws /socket.io ◀── servidor Socket.IO mock
                                                                                          │
                                                       banco em memória (localStorage) ◀──┘
```

- **Camadas**: `routes/` só compõe páginas; `features/<domínio>/` concentra `api.ts`, `queries.ts`, componentes e
  regras do domínio; `shared/` tem o que não conhece domínio (cliente HTTP, socket, UI, layout, formatação de
  ETH); `contracts/` é a fonte única de tipos; `mocks/` simula o backend.
- **Contratos tipados de ponta a ponta**: `src/contracts` define em zod os requests, as respostas, os erros e
  os eventos. O app valida **toda** resposta na borda (`request(cfg, schema)` em `shared/api/client.ts`):
  um 2xx fora do contrato vira `ApiError` `UNKNOWN` e nunca chega à UI. Os handlers MSW montam as respostas
  com os mesmos tipos, então mock, transporte, cache e UI compartilham uma definição.
- **O servidor é a fonte da verdade**: carrinho, cotação, disponibilidade e pedidos vivem no mock. O front
  formata valores, mas nunca soma valores para decidir algo; totais vêm de `POST /quotes`.

## 2. Contratos REST

Base `VITE_API_URL` (padrão `/api`). JSON em tudo, exceto o upload de avatar (multipart). Autenticação por
`Authorization: Bearer <token>`; o carrinho de visitante vai em `X-Guest-Cart: <guestCartId>` (enviado
também logado, para permitir o merge).

### Formato de erro

```json
{ "error": { "code": "QUOTE_STALE", "message": "…", "fields": { "campo": "mensagem" }, "details": { … } } }
```

| Código                                | HTTP    | Uso                                                             |
| ------------------------------------- | ------- | --------------------------------------------------------------- |
| `BAD_REQUEST`                         | 400     | Requisição malformada (ex.: falta `Idempotency-Key`)            |
| `VALIDATION_ERROR`                    | 400/422 | Campos inválidos; `fields` mapeia para os inputs                |
| `UNAUTHENTICATED` / `SESSION_EXPIRED` | 401     | Sem sessão / sessão vencida no servidor                         |
| `FORBIDDEN`                           | 403     | Recurso de outra conta (pedido, carteira); nada dele é exposto  |
| `NOT_FOUND`                           | 404     | Recurso inexistente                                             |
| `CONFLICT`, `EMAIL_TAKEN`             | 409     | Unicidade (nome de usuário, e-mail), carteira desconectada      |
| `AVAILABILITY_CONFLICT`               | 409     | Quantidade acima do disponível na edição                        |
| `QUOTE_STALE`                         | 409     | Cotação mudou; `details.quote` traz a nova                      |
| `IDEMPOTENCY_CONFLICT`                | 409     | Mesma `Idempotency-Key` com corpo diferente                     |
| `COUPON_INVALID` / `COUPON_EXPIRED`   | 422     | Cupom recusado                                                  |
| `TRANSIENT`                           | 503     | Falha temporária; o único caso (com erro de rede) que tem retry |

No cliente, `toApiError` normaliza também falhas sem resposta: `NETWORK` (offline), `TIMEOUT` (8 s, via
`AbortSignal`) e `UNKNOWN` (contrato violado ou erro inesperado).

### Endpoints

| Método e rota                              | Request                                                                         | Resposta 2xx                                                                                                                                                          | Erros principais                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/register`                      | `{ username, email, password, confirmPassword }`                                | 201 `{ token, user, expiresAt }`                                                                                                                                      | 422 campos, 409 `EMAIL_TAKEN` / `CONFLICT` (username)                                                                   |
| `POST /auth/login`                         | `{ email, password }`                                                           | `{ token, user, expiresAt }`                                                                                                                                          | 401 `UNAUTHENTICATED`                                                                                                   |
| `GET /auth/session`                        | —                                                                               | `{ user, expiresAt }`                                                                                                                                                 | 401 `UNAUTHENTICATED` / `SESSION_EXPIRED`                                                                               |
| `POST /auth/logout`                        | —                                                                               | 204                                                                                                                                                                   | —                                                                                                                       |
| `GET /nfts`                                | `?q&category[]&network[]&edition&minPrice&maxPrice&tab&sort&page&pageSize`      | `{ items: NftListItem[], page, pageSize, total, totalPages }`                                                                                                         | 503 `TRANSIENT` (cenário)                                                                                               |
| `GET /nfts/featured`                       | —                                                                               | `NftListItem[]`                                                                                                                                                       | 503                                                                                                                     |
| `GET /nfts/:id`                            | —                                                                               | `Nft` (edições com `price`, `supply`, `available`)                                                                                                                    | 404                                                                                                                     |
| `GET /categories`                          | —                                                                               | `{ id, name, count }[]`                                                                                                                                               | 503                                                                                                                     |
| `GET /catalog/facets`                      | —                                                                               | `{ networks: { network, count }[], priceRange }`                                                                                                                      | 503                                                                                                                     |
| `GET /favorites`                           | —                                                                               | `{ items: NftListItem[] }`                                                                                                                                            | 401                                                                                                                     |
| `PUT /favorites/:nftId`                    | —                                                                               | `{ nftId, favorited: true }`                                                                                                                                          | 401, 404                                                                                                                |
| `DELETE /favorites/:nftId`                 | —                                                                               | `{ nftId, favorited: false }`                                                                                                                                         | 401                                                                                                                     |
| `GET /cart`                                | —                                                                               | `Cart { id, items[], couponCode, updatedAt }`                                                                                                                         | —                                                                                                                       |
| `POST /cart/items`                         | `{ nftId, editionId, quantity }`                                                | `Cart`                                                                                                                                                                | 404, 409 `AVAILABILITY_CONFLICT`                                                                                        |
| `PATCH /cart/items/:itemId`                | `{ quantity }`                                                                  | `Cart`                                                                                                                                                                | 404, 409 `AVAILABILITY_CONFLICT`                                                                                        |
| `DELETE /cart/items/:itemId`               | —                                                                               | `Cart`                                                                                                                                                                | 404                                                                                                                     |
| `POST /cart/merge`                         | `{ guestCartId }`                                                               | `{ cart, adjustments: { nftId, editionId, requested, applied }[] }`                                                                                                   | 401                                                                                                                     |
| `PUT /cart/coupon`                         | `{ code }`                                                                      | `Cart`                                                                                                                                                                | 422 `COUPON_INVALID` / `COUPON_EXPIRED`                                                                                 |
| `DELETE /cart/coupon`                      | —                                                                               | `Cart`                                                                                                                                                                | —                                                                                                                       |
| `POST /quotes`                             | `{ network }` (itens e cupom vêm do carrinho no servidor)                       | `Quote { quoteId, version, network, lines[], subtotal, discount, networkFee, total, coupon, issues[], expiresAt }`; cupom que deixou de valer sai como `coupon: null` | 422                                                                                                                     |
| `POST /orders`                             | header `Idempotency-Key`; `{ quoteId, quoteVersion, walletId, network, buyer }` | 201 `Order` (`pending`); reenvio com a mesma chave → mesmo pedido                                                                                                     | 400 sem chave, 409 `QUOTE_STALE` (+ `details.quote`), 409 `IDEMPOTENCY_CONFLICT`, 409 carteira desconectada, 422 campos |
| `GET /orders`                              | —                                                                               | `Order[]` do usuário, mais recentes primeiro                                                                                                                          | 401                                                                                                                     |
| `GET /orders/:id`                          | —                                                                               | `Order { id, status, version, txHash, explorerUrl, rejectionReason, snapshot }`                                                                                       | 401, 403 (pedido de outra conta), 404                                                                                   |
| `GET /explorer/tx/:hash`                   | —                                                                               | `Transaction { hash, status, network, blockNumber, timestamp, tokens, value, networkFee }` (público)                                                                  | 404 (hash desconhecido ou pedido não confirmado)                                                                        |
| `GET /me` / `PATCH /me`                    | `{ displayName, username, email, ensName, walletLabel }`                        | `Profile`                                                                                                                                                             | 409 `EMAIL_TAKEN` / `CONFLICT`, 422                                                                                     |
| `POST /me/avatar` / `DELETE /me/avatar`    | multipart `avatar` (PNG/JPEG/WebP ≤ 2 MiB)                                      | `Profile`                                                                                                                                                             | 422 tipo/tamanho                                                                                                        |
| `POST /me/password`                        | `{ currentPassword, newPassword, confirmPassword }`                             | 204                                                                                                                                                                   | 422 (senha atual errada vai em `fields`)                                                                                |
| `GET /avatars/:userId`                     | —                                                                               | imagem                                                                                                                                                                | 404                                                                                                                     |
| `GET /wallets` / `POST /wallets`           | campos do frame Pagamento + `slot` (`primary` / `secondary`)                    | `Wallet[]` / 201 `Wallet`                                                                                                                                             | 409 slot ocupado, 422                                                                                                   |
| `PATCH /wallets/:id`                       | campos editáveis                                                                | `Wallet`                                                                                                                                                              | 403, 404, 422                                                                                                           |
| `POST /wallets/:id/connect` / `disconnect` | —                                                                               | `Wallet` (`connection`: `connected` / `disconnected`)                                                                                                                 | 403, 404, 409 `CONFLICT` (carteira recusou; fica `declined`)                                                            |

Todas as rotas privadas respondem 401 sem sessão. Um item do carrinho é identificado por
`(nftId, editionId)`, e a disponibilidade é por edição. Redes: `ethereum`, `polygon`, `solana` (as do layout),
cada uma com sua taxa fixa na cotação.

**Rotas de controle do mock** (`/__mock/*`, só com mocks ligados, fora da rede simulada): descritas no
README. Elas mudam o banco e, quando é o caso, emitem o evento pelo socket; nunca tocam em UI ou cache.

## 3. Eventos em tempo real

Envelope comum (`src/contracts/events.ts`):

```ts
{ eventId: string, type, resource: { type, id }, version: number, occurredAt: string, userId?: string, data }
```

| Evento          | Recurso      | `data`                                             | Quem recebe                             |
| --------------- | ------------ | -------------------------------------------------- | --------------------------------------- |
| `nft.updated`   | `nft:<id>`   | `{ editions: { id, price, available }[], status }` | Todos os sockets (inclusive visitantes) |
| `order.updated` | `order:<id>` | `{ status, txHash, rejectionReason, explorerUrl }` | Só sockets autenticados como o dono     |

**Garantias e o que o cliente faz com elas:**

- **Entrega pelo menos uma vez, sem ordem garantida**: a porta de eventos (`shared/realtime/event-gate.ts`)
  descarta `eventId` já visto (janela dos últimos 500) e qualquer versão menor ou igual à última aceita do
  mesmo recurso. Reentrega e chegada fora de ordem nunca fazem o estado regredir. Os testes usam
  `/__mock/socket/replay-last` e `emit-stale` para provar isso.
- **Todo evento passa pelo schema**: payload inválido é ignorado.
- **Isolamento**: o servidor mock só entrega `order.updated` ao socket cujo `auth.token` pertence ao dono, e o
  cliente também descarta eventos com `userId` diferente da sessão atual (defesa em profundidade).
- **Eventos são coerentes com o REST**: toda mudança no mock (painel, testes, resolução de pedido) altera o
  banco e emite o evento na mesma operação; o que o socket diz é o que o próximo GET devolveria.

## 4. Sessão

- Login e cadastro devolvem `{ token, user, expiresAt }`. O token fica em `localStorage` (`kurio:session`) e
  vai como Bearer. **Desvio consciente**: o ideal seria um cookie httpOnly, mas o MSW não emite cookies
  httpOnly de forma confiável. Senhas no mock usam hash PBKDF2 (WebCrypto) com salt, nunca em claro.
- **Boot**: `GET /auth/session` valida a sessão uma vez por carregamento; os guards (`beforeLoad`) das rotas
  privadas (`/checkout`, `/perfil`, `/carteiras`, `/favoritos`, `/pedido/:id`) esperam essa validação.
  Sessão vencida localmente (`expiresAt`) também conta como expirada. Queda de rede no boot mantém a sessão.
- **Expiração no meio do uso**: o interceptor do Axios trata 401 de requisição que levava token (exceto as
  marcadas `skipUnauthorizedHandler`): limpa a sessão, guarda a rota atual e leva a
  `/login?redirect=…` com o aviso "Sua sessão expirou". O rascunho do checkout
  (`kurio:checkout:<userId>:draft`, sem dados sensíveis) **sobrevive** à expiração e é restaurado ao voltar.
- **Logout e troca de usuário**: todas as chaves privadas do Query começam por `['user', userId]`; a troca de
  sessão remove essas queries, limpa os rascunhos do usuário (só no logout, não na expiração) e o
  `RealtimeProvider` recria o socket com o novo token (ou como visitante).
- O mock expira sessões por tempo (TTL de 2 h, 60 s no cenário `session-expired`) e por comando
  (`/__mock/session/expire`).

## 5. Carrinho: servidor, visitante e merge

- O carrinho é do servidor. O visitante recebe um `guestCartId` (localStorage `kurio:guest-cart`) enviado em
  `X-Guest-Cart`; as chaves de cache são `['guest', id, 'cart']` ou `['user', userId, 'cart']`.
- **Merge no login/cadastro**: `POST /cart/merge` une o carrinho de visitante ao do usuário respeitando a
  disponibilidade e devolve `adjustments` (pedido × aplicado), mostrados em toast e anúncio `aria-live`. O
  merge é aguardado antes do redirect; se falhar, o login segue e os itens ficam para o próximo login.
- **Mutações otimistas**: quantidade do item e favoritos, com rollback e aviso em erro. Cada resposta do
  servidor traz o carrinho inteiro; `isNewestServerCart` (comparando `updatedAt`) impede que uma resposta
  atrasada sobrescreva uma mais nova. Nesse caso o cache é invalidado em vez de substituído.
- **Cotação**: `useQuote(network)` com `staleTime: 0` e chave por dono (nunca reaproveitada entre usuários);
  invalidada por mudanças no carrinho e por `nft.updated` de item do carrinho, que também gera o aviso
  acessível "Preço de X mudou de A para B" / "Edição esgotada".

## 6. Checkout e pedidos

1. Formulário com os campos do frame Pagamento (zod + react-hook-form); erros `fields` da API voltam para os
   inputs. Rascunho salvo continuamente.
2. Carteira: as cadastradas em radio cards, com a principal pré-selecionada; conectar/recusar pela API.
3. **Confirmar** envia `quoteId` + `quoteVersion`. Se preço, disponibilidade, cupom ou taxa mudaram, o servidor
   responde `409 QUOTE_STALE` com a cotação nova; o app grava essa cotação no cache e abre a revisão com
   antes/depois por linha, selos (Esgotado, Só N disponíveis, Preço alterado) e o botão **Confirmar novo
   total**. Um `nft.updated` com a revisão aberta também atualiza o "depois".
4. **Idempotência**: uma `Idempotency-Key` (UUID) por tentativa de compra, guardada **com o corpo enviado**
   em `kurio:order-attempt:<userId>` (sessionStorage), no estado `sent` até haver resposta definitiva (pedido
   ou 4xx). Botão travado durante a mutation. No timeout (8 s), o app mostra "Verificando seu pedido…" e
   reenvia; enquanto a tentativa estiver `sent`, **todo** reenvio (Tentar novamente, cotação refeita por foco
   ou evento, Voltar → Confirmar) usa a mesma chave e o mesmo corpo, e o mock devolve o pedido já criado. Se a
   página recarregar nesse meio-tempo, o checkout encontra a tentativa `sent` e a reenvia antes de mostrar o
   formulário. Resolvida, a mesma cotação reusa a chave (duplo clique) e uma cotação nova começa outra
   tentativa. Mesma chave com corpo diferente dá `409 IDEMPOTENCY_CONFLICT`.
5. O pedido nasce `pending`; o id fica em `kurio:pending-order:<userId>`. Após refresh ou reconexão, o app
   consulta `GET /orders/:id` e retoma a tela de status; um id lembrado que o servidor não conhece (404,
   ex.: dados do mock resetados) é esquecido, para não prender o checkout. O mock resolve para `confirmed` ou `rejected` (4 s)
   e emite `order.updated`.
6. A confirmação só aparece com `status === 'confirmed'` vindo do servidor; o recibo usa o `snapshot` do
   pedido. Confirmado, o servidor remove do carrinho só o que foi comprado e o app invalida o carrinho;
   recusa preserva o carrinho. `confirmed` e `rejected` são terminais.

## 7. Cache, retry e sincronização

| Dado                         | `staleTime` | Revalida ao focar | Observações                                     |
| ---------------------------- | ----------- | ----------------- | ----------------------------------------------- |
| Catálogo, destaques, detalhe | 30 s        | não               | `placeholderData: keepPreviousData` no catálogo |
| Categorias                   | 5 min       | não               |                                                 |
| Privados (`['user', …]`)     | 10 s        | sim               | carrinho, favoritos, perfil, carteiras, pedidos |
| Cotação                      | 0           | —                 | por dono e rede                                 |

- **Retry**: queries tentam de novo até 2 vezes, com backoff de 1 s e depois 2 s (`500·2^n`), **só** para
  `NETWORK`, `TRANSIENT` ou 5xx. Nunca para 4xx, timeout ou contrato violado. Mutations não têm retry
  automático; o reenvio de pedido é manual e idempotente. `GET /orders/:id` não repete 404.
- **Timeout** de 8 s por requisição (Axios com adapter `fetch` e `AbortSignal`).
- **Cancelamento e ordem**: o `signal` do Query vai para o Axios. Mudou o filtro, a requisição antiga é
  cancelada; uma resposta que chega fora de ordem cai numa chave que não está mais na tela e não altera o
  grid (cenário `out-of-order`).
- **Catálogo na URL**: search params validados com zod no Router (`q`, `category[]`, `network[]`, `edition`,
  `minPrice`, `maxPrice`, `tab`, `sort`, `page`); qualquer filtro novo zera `page`; a busca tem debounce
  (Enter envia na hora). Tudo sobrevive a refresh, voltar e compartilhamento de link.

## 8. Reconciliação REST ↔ Socket

- **Aplicação dos eventos**: `nft.updated` faz `setQueryData` no detalhe e nas listas que contêm o NFT
  (preço, disponibilidade e status) e invalida carrinho e cotação; `order.updated` grava o pedido no cache,
  com toast global "Pedido confirmado" / "Pagamento recusado".
- **Porta** antes de tudo (deduplicação + versão por recurso, §3).
- **REST nunca regride o que o evento trouxe**: as buscas do pedido e do detalhe do NFT passam por
  `fetchNewest`. Se, enquanto a resposta viajava, um evento gravou no cache uma versão mais nova, a
  resposta (lida antes do evento) é descartada. Sem isso, um refetch em andamento podia devolver
  "Pendente" depois do `order.updated` "Confirmado" e, com o socket conectado, nada mais corrigia a tela.
- **Reconexão**: o socket reconecta sozinho (backoff do socket.io-client). No `connect` depois de uma queda,
  `refreshAfterReconnect` invalida, **só nas queries ativas**, tudo o que eventos mantêm (catálogo,
  destaques, detalhe, carrinho, cotação, pedido). Eventos perdidos durante a queda são recuperados pelo REST.
- **Fallback sem socket**: pedido `pending` com socket fora de `connected` é consultado a cada 5 s; a cada
  (re)conexão com pedido pendente, um GET confere o estado (um evento pode ter saído antes da conexão).
- **Isolamento por usuário**: chaves privadas prefixadas por `userId`, socket recriado na troca de sessão,
  filtro de `userId` nos eventos e 404 para pedido de outro usuário.

## 9. Socket.IO no MSW: transporte e limitações

O `@mswjs/socket.io-binding` intercepta o WebSocket de `/socket.io` no Service Worker e fala o protocolo
Engine.IO/Socket.IO. O servidor mock (`src/mocks/socket/server.ts`) mantém os "peers" conectados, lê
`auth.token` do pacote CONNECT para saber o usuário e entrega os eventos.

Limitações (aceitas e cobertas pelos testes):

- **Só WebSocket**: o binding não simula long-polling, então o cliente usa `transports: ['websocket']`.
  Contra um backend real, o fallback para polling poderia ser religado.
- **Sem acks e sem rooms reais**: o isolamento é feito pelo servidor mock filtrando por usuário em cada
  emissão, e a confiabilidade vem da porta de eventos + revalidação REST, não de confirmação de entrega.
- **Depende do Service Worker**: sem SW (navegação privada restrita, primeiro carregamento antes de o worker
  assumir), nem REST nem socket existem. `enableMocking()` registra o worker antes de o app renderizar, e
  esse custo pesa no Lighthouse mobile, sobretudo no `vite preview` local (ver `lighthouse/SUMMARY.md`).
- **Worker reiniciado pelo navegador**: o MSW guarda em memória quais abas ativaram os mocks, e o navegador
  encerra o worker ocioso (aba em segundo plano, economia de energia). Ao voltar, a lista estava vazia e as
  chamadas da API iam para a rede (a hospedagem respondia com o `index.html`). O worker registrado é o
  `public/mock-sw.js`, que carrega o `mockServiceWorker.js` original e readota a aba na primeira chamada da
  API. O teste `13-mock-worker-restart` reinicia o worker no meio da sessão e confere login e catálogo.
- **Mesma aba, mesmo banco**: cada aba tem seu próprio servidor mock, e o banco é compartilhado via
  localStorage. Duas abas veem o mesmo estado ao recarregar, e eventos emitidos numa aba chegam aos sockets
  daquela aba.
- **Quedas simuladas**: `/__mock/socket/drop` fecha as conexões no servidor (com `holdMs` opcional para recusar
  reconexões por um tempo), o que exercita o caminho real de reconexão do cliente.

## 10. Camada de mocks

- Banco em memória com persistência em localStorage (`kurio:mockdb:v1`) e seed determinístico: ~60 NFTs em 9
  categorias, edições com supply variado (inclusive esgotadas), 2 usuários, cupons.
- **Cenários** configuram o servidor (rede, TTL de sessão, desfecho e atraso de pedido, surpresas no
  checkout, conflitos); `reset` restaura o banco do cenário escolhido.
- **Rede simulada** (`withNetwork`) envolve todo handler de dados: latência semeada por perfil, falha de
  rede (`offline`), 503 intermitente (`flaky`) ou no catálogo (`server-errors`), atraso de 12 s em
  `POST /orders` (`timeout-orders`) e a inversão de ordem das buscas (`out-of-order`).
- **Surpresas no checkout** (`price-change-during-checkout`, `sold-out-during-checkout`): aplicadas uma vez,
  no primeiro envio do pedido, antes da validação da cotação, sem evento no socket, para que o caminho
  testado seja o `QUOTE_STALE` do servidor e não o aviso em tempo real.
- **Painel de cenários** (`src/mocks/panel`): montado numa raiz React própria, só com mocks ligados; usa a
  mesma API `/__mock/*` dos testes. Fica acima das barras fixas do rodapé (`data-bottom-bar`).
- Com `VITE_ENABLE_MOCKS` diferente de `true`, `src/mocks` não entra no bundle (import dinâmico).
- **Boot só sob o Service Worker**: o worker do MSW se desregistra quando a última aba sai, e uma navegação
  logo em seguida pode nascer sem controlador. O MSW recarrega essa página, mas `worker.start()` resolve
  antes; por isso `enableMocking()` espera o `controllerchange` (ou a recarga) antes de o app renderizar.
  Sem isso, as primeiras chamadas iam para a rede real (na Vercel, a reescrita de SPA).

## 11. Decisões de UX

- **Idioma pt-BR** (copy do layout), `<html lang="pt-BR">`, ETH sempre com ponto decimal e mínimo de 2 casas.
- **Estados de carregamento**: skeletons com as dimensões do conteúdo (shimmer desligado com
  `prefers-reduced-motion`), estado de atualização em segundo plano, vazio com ação e erro com
  **Tentar novamente**, separados por causa (sem conexão, instabilidade, timeout, 404).
- **Comprar**: "COMPRAR" no detalhe adiciona ao carrinho e leva a `/carrinho`; o ícone de carrinho no card e
  no detalhe só adiciona, com toast e o contador do header (total de unidades).
- **Login e cadastro** são rotas (deep link e `redirect` funcionam). No desktop aparecem como modal sobre a
  Início, como no layout (foco preso, `Esc` ou clique fora voltam à página anterior); no mobile, tela cheia.
- **Busca**: no desktop o layout não tem barra de busca; a lupa do header abre o campo num popover. Abaixo
  de 1280 px o campo fica no topo do catálogo, ao lado do botão de filtros (drawer). Fora da Início, a lupa
  leva à Início com a busca aberta.
- **Filtros** como no layout: listas de texto em que cada linha é um botão de alternar (`aria-pressed`, OR
  dentro do grupo; o item ativo fica na cor de destaque e sublinhado). A faixa de preço só vai para a URL em
  "Aplicar". O filtro de edição não tem controle na barra lateral (o layout não o desenha) e é aplicado pelo
  promo "Lançamentos gênesis".
- **Perfil** com dois formulários (dados e senha), para que trocar a senha não dependa dos outros campos.
- **Toasts** no topo (a base é ocupada pela barra inferior no mobile); falhas de mutation também são
  anunciadas por `aria-live`.
- **Navegação mobile**: header compacto com menu em Sheet e barra inferior de ícones abaixo de 1280 px.
- **Fora do escopo** (Criadores, Aprenda, Atividade, Ofertas, Downloads, editorial, escanear, newsletter): os
  itens aparecem como no layout, mas não navegam nem simulam sucesso. A newsletter explica que o envio
  ainda não existe.
- **Explorador de transações**: "Ver no explorador" abre `/explorador/tx/:hash`, uma página simulada
  (`GET /explorer/tx/:hash`) com hash, rede, bloco, data e valores do pedido confirmado. É pública como um
  explorador de verdade, por isso não expõe comprador, carteira nem itens.

## 12. Desvios do layout

Inconsistências do arquivo de design e como foram normalizadas:

| Onde            | No layout                                              | Decisão                                                              |
| --------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| Estilos         | Descrição de estilo diverge do valor aplicado          | Valor aplicado nos nós                                               |
| Grid do Início  | Card sem nome/preço entre os demais                    | Card único e consistente                                             |
| Promos          | Texto cortado                                          | Texto completo                                                       |
| Ordenação       | Rótulo sobreposto à seta                               | Seletor com largura adequada                                         |
| Detalhe desktop | Conteúdo de "Contrato" e "Direitos" trocados           | Conteúdo correto em cada seção                                       |
| Detalhe mobile  | Edições "1/10, 1/10, 1/50"                             | Mesmas edições do desktop                                            |
| Carrinho        | Token incoerente com o NFT; subtotal ≠ soma das linhas | Token coerente; valores sempre da cotação                            |
| Contagens       | Filtro de rede ≠ total por categoria                   | Contagens calculadas das fixtures (`/categories`, `/catalog/facets`) |
| Faixa de preço  | Vírgula decimal num lugar, ponto no resto              | Ponto decimal em todo ETH                                            |
| Desconto        | "(-) 00.00"                                            | "(-) 0.00 ETH"                                                       |

Desvios deliberados, por exigência do enunciado ou por acessibilidade:

- **Header no mobile**: mantido (logo, busca e menu), porque login, conta e busca precisam estar ao alcance
  em qualquer largura.
- **Galeria**: no mobile, os pontos sobre a arte ficam visíveis e trocam a imagem; cada ponto tem área de
  toque de 24 px (o desenho continua do mesmo tamanho, só um pouco mais espaçado). Existem 3 composições por
  arte, então são 3 miniaturas.
- **Carrinho desktop**: a edição ("1/10", "1/50") aparece em cada linha, porque o mesmo NFT pode estar no
  carrinho em edições diferentes.
- **Cupom**: o botão "Aplicar" usa texto escuro sobre o laranja, para atingir contraste AA.
- **Checkout mobile**: mantém o formulário do comprador (o frame mobile de pagamento só mostra a carteira),
  porque o enunciado exige validar esses campos antes do envio. As carteiras vêm primeiro, como no frame.
- **Seletor de carteira**: lista as carteiras cadastradas pelo usuário, não os três provedores fixos do
  layout. É o que o enunciado pede ("utilizar as carteiras cadastradas").
- **Carrossel "Mais desta coleção"**: cards esgotados têm o rótulo "Esgotado", para o estado não depender só
  da cor.
- **Confirmação do pedido**: em vez do modal do layout, uma página de status (`/pedido/:id`) acompanha o
  pedido de "Pendente" a "Confirmado" ou "Recusado" e sobrevive a refresh e reconexão. O recibo é o do layout.
- **"Ver no explorador"** no lugar de "Ver no Etherscan": o link leva ao explorador simulado da demo.
- **Sidebar da conta**: o item ativo segue o layout; Atividade e Ofertas aparecem, mas são inertes.
- **Diálogos não desenhados** (revisão do pedido, cotação alterada, arte ampliada) usam overlay escuro; o
  modal de login segue o layout, sem escurecer o fundo.
- **Resumo do carrinho no mobile**: inline abaixo da lista, em vez do sheet fixo, que disputaria espaço com a
  barra inferior.

## 13. Acessibilidade

Ajustes sobre o layout:

- Texto de erro em coral `#F0805F` (contraste ≥ 7:1); o vermelho `#ED1B2E` (4,4:1) fica só em ícones e bordas.
- Foco visível em todos os controles (`outline 2px` primary, offset 2px); o layout não desenha foco.
- Estado nunca só por cor: "Esgotada", carteira "Conectada/Recusada" e campo inválido têm texto e ícone.
- Alvos de toque ≥ 24 px: os pontos da galeria e do carrossel e os steppers de 29 px do carrinho ganham área
  estendida.
- Drawer de filtros e diálogos com foco preso, Esc fecha e o foco volta ao gatilho; galeria no padrão ARIA de
  abas; erros ligados por `aria-describedby`; avisos de tempo real e de mutation em `aria-live`.
- Texto decorativo (monogramas, contadores visuais) via CSS `content: attr(...)`, para o nome acessível não
  divergir do rótulo visível.
- Verificado por axe (sem violações sérias ou críticas nas rotas principais), navegação por teclado, sem
  overflow horizontal de 320 a 1440 px e zoom de 200% (`e2e/11-keyboard-a11y.spec.ts`).

## 14. Assets e substituições

- **Fonte**: Roboto Mono do layout, self-hosted em woff2 (subset latin, `@fontsource/roboto-mono`, OFL), sem
  substituição.
- **Artes dos NFTs**: o arquivo usa só 4 artes (1254×1254). Viraram 12 composições (original, espelhada,
  close-up) em 320/640/960 px, AVIF e WebP, em `public/images/nfts/`, com `srcset`, dimensões fixas e
  prioridade alta nas imagens da 1ª dobra.
- **Ícones e logos**: os SVGs do arquivo (Iconly e logos de carteiras) estão em `src/shared/ui/icons.tsx`, com
  a cor trocada por `currentColor`. Ícones que o layout não desenha (estados de erro, coração do card) vêm do
  `lucide-react` com o mesmo traço de 1,5 px.
- 4 imagens do arquivo sem uso visível (prints de outro projeto) foram descartadas.

## 15. Testes e qualidade

- **Unit (Vitest)**: contratos, banco e handlers do mock, porta de eventos, cliente HTTP, hooks e componentes.
- **E2E (Playwright)**: projetos `chromium-desktop` (1440×900), `chromium-mobile` (390×844) e `tablet-smoke`
  (768×1024, só `@layout`), contra `vite preview` do build de demo. Cada teste reseta o mock num contexto novo;
  testes de tempo real disparam eventos pela API de controle e passam pelo socket.io-client de verdade.
- **Regressão visual**: Início, Detalhe, Carrinho e Checkout × desktop/mobile com relógio fixo, animações
  desligadas e painel oculto. Baselines Linux versionadas em `e2e/__screenshots__/`, geradas e comparadas no
  container do Playwright (`pnpm test:visual`, `pnpm test:visual:update`) e no CI.
- **Lighthouse**: `pnpm lighthouse`, mediana de 3 rodadas; resultados e justificativa em
  `lighthouse/SUMMARY.md`.
