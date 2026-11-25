/* eslint-disable */
/**
 * Service Worker da demo: carrega o worker do MSW sem alterá-lo (mockServiceWorker.js, regerado pelo
 * pacote) e corrige um ponto dele.
 *
 * O MSW guarda em memória (`activeClientIds`) quais abas ativaram os mocks. O navegador encerra o
 * worker quando ele fica ocioso (aba em segundo plano, economia de energia) e, ao religá-lo, essa lista
 * volta vazia: o worker passa a deixar as chamadas da API seguirem para a rede, e a hospedagem responde
 * com o index.html. A aba, porém, continua com o MSW ativo e pronto para responder.
 *
 * Este listener roda antes do listener do MSW (é registrado primeiro): quando uma chamada da API chega
 * de uma aba que o worker esqueceu, ele a readota, e o MSW segue normalmente. Só as chamadas da API
 * contam, porque o app só as faz depois de `worker.start()`; assets continuam com a regra original.
 */
const API_PREFIX = new URL(self.location.href).searchParams.get('api') || '/api'

self.addEventListener('fetch', function (event) {
  if (!event.clientId || event.request.mode === 'navigate') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname !== API_PREFIX && !url.pathname.startsWith(API_PREFIX + '/')) return
  // `activeClientIds` é declarado no script do MSW (escopo global compartilhado entre scripts).
  if (!activeClientIds.has(event.clientId)) activeClientIds.add(event.clientId)
})

importScripts('./mockServiceWorker.js')
