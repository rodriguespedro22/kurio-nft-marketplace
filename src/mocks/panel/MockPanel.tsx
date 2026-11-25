import { useEffect, useId, useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { toast } from 'sonner';

import type { Nft } from '@/contracts';
import { addEth, formatEth, pctEth } from '@/shared/money/eth';
import { Button } from '@/shared/ui/button';
import { Select } from '@/shared/ui/select';

import { API_URL } from '../handlers/http';
import { NETWORK_PROFILES, type NetworkProfileName } from '../network/profiles';
import { SCENARIO_NAMES, SCENARIOS, type ScenarioName } from '../scenarios';

const NETWORK_LABELS: Record<NetworkProfileName, string> = {
  normal: 'Normal',
  slow: 'Lenta (2,5 s)',
  jitter: 'Instável (0,1–3 s)',
  offline: 'Offline',
  flaky: 'Falha intermitente',
  'timeout-orders': 'Timeout no pedido',
  'server-errors': 'Erros do servidor (503)',
};

type MockState = { scenario: ScenarioName; network: NetworkProfileName };

async function control<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return (await response.json()) as T;
}

const nftIdFromPath = () => /^\/nft\/([^/]+)/.exec(window.location.pathname)?.[1] ?? null;

/** NFT da página atual (o painel vive fora do router: lê a URL enquanto está aberto). */
function useCurrentNftId(active: boolean) {
  const [nftId, setNftId] = useState(nftIdFromPath);
  const refresh = () => setNftId(nftIdFromPath());
  useEffect(() => {
    if (!active) return;
    const sync = () => setNftId(nftIdFromPath());
    const timer = window.setInterval(sync, 500);
    window.addEventListener('popstate', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('popstate', sync);
    };
  }, [active]);
  return { nftId: active ? nftId : null, refresh };
}

/** Altura ocupada por barras fixas no rodapé (`data-bottom-bar`): o painel fica acima delas. */
function bottomBarsInset(): number {
  let inset = 0;
  for (const bar of document.querySelectorAll<HTMLElement>('[data-bottom-bar]')) {
    if (getComputedStyle(bar).position !== 'fixed') continue;
    const rect = bar.getBoundingClientRect();
    if (rect.height > 0) inset = Math.max(inset, window.innerHeight - rect.top);
  }
  return Math.round(inset);
}

function useBottomInset(): number {
  const [inset, setInset] = useState(bottomBarsInset);
  useEffect(() => {
    const sync = () => setInset(bottomBarsInset());
    const timer = window.setInterval(sync, 500);
    window.addEventListener('resize', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', sync);
    };
  }, []);
  return inset;
}

/** Edição alvo das ações do painel: a primeira ainda disponível (ou a primeira). */
async function targetEdition(nftId: string) {
  const response = await fetch(`${API_URL}/nfts/${nftId}`);
  if (!response.ok) throw new Error('NFT indisponível no momento.');
  const nft = (await response.json()) as Nft;
  const edition = nft.editions.find((item) => item.available > 0) ?? nft.editions[0];
  if (!edition) throw new Error('NFT sem edições.');
  return edition;
}

const failed = (error: unknown) =>
  toast.error(error instanceof Error ? error.message : 'A ação do painel falhou.');

/**
 * Painel da demo (fora de `src/features`): troca cenário e rede, reseta os dados, muda preço ou
 * estoque do NFT aberto e derruba o socket — tudo pelos endpoints `/__mock/*`.
 */
export function MockPanel() {
  const panelId = useId();
  const titleId = useId();
  const scenarioId = useId();
  const networkId = useId();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<MockState | null>(null);
  const [busy, setBusy] = useState(false);
  const { nftId, refresh } = useCurrentNftId(open);
  const bottomInset = useBottomInset();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    control<MockState>('/__mock/state')
      .then((next) => {
        if (alive) setState(next);
      })
      .catch(failed);
    return () => {
      alive = false;
    };
  }, [open]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      failed(error);
    } finally {
      setBusy(false);
    }
  }

  // Cenário novo (ou o mesmo, em "Resetar dados"): banco resetado e app recarregado do zero.
  const resetTo = (scenario: ScenarioName) =>
    run(async () => {
      await control('/__mock/reset', { scenario });
      window.location.reload();
    });

  const changeNetwork = (profile: NetworkProfileName) =>
    run(async () => {
      setState(await control<MockState>('/__mock/network', { profile }));
      toast.success(`Rede: ${NETWORK_LABELS[profile]}`);
    });

  const changePrice = (id: string) =>
    run(async () => {
      const edition = await targetEdition(id);
      const price = addEth(edition.price, pctEth(edition.price, 10));
      await control(`/__mock/nfts/${id}/update`, { editionId: edition.id, price });
      toast.success(`Edição ${edition.label}: ${formatEth(price)}`);
    });

  const soldOut = (id: string) =>
    run(async () => {
      const edition = await targetEdition(id);
      await control(`/__mock/nfts/${id}/update`, { editionId: edition.id, available: 0 });
      toast.success(`Edição ${edition.label} esgotada`);
    });

  const dropSocket = () =>
    run(async () => {
      await control('/__mock/socket/drop', {});
      toast.success('Socket derrubado: o app reconecta sozinho.');
    });

  return (
    <div
      style={{ bottom: bottomInset + 16 }}
      className="fixed left-4 z-60 flex max-h-[calc(100dvh-6rem)] max-w-[calc(100vw-2rem)] flex-col items-start gap-2 text-body-sm"
    >
      {open ? (
        <section
          id={panelId}
          aria-labelledby={titleId}
          className="flex min-h-0 w-72 max-w-full flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-surface p-4 shadow-xl"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="font-bold text-foreground">
              Painel de cenários
            </h2>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Fechar painel de cenários"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>

          <div className="flex flex-col gap-1 text-secondary">
            <label htmlFor={scenarioId}>Cenário</label>
            <Select
              id={scenarioId}
              value={state?.scenario ?? ''}
              disabled={!state || busy}
              onChange={(event) => void resetTo(event.target.value as ScenarioName)}
            >
              {SCENARIO_NAMES.map((name) => (
                <option key={name} value={name}>
                  {SCENARIOS[name].label}
                </option>
              ))}
            </Select>
          </div>
          {state ? <p className="text-caption text-muted">{SCENARIOS[state.scenario].description}</p> : null}

          <div className="flex flex-col gap-1 text-secondary">
            <label htmlFor={networkId}>Perfil de rede</label>
            <Select
              id={networkId}
              value={state?.network ?? ''}
              disabled={!state || busy}
              onChange={(event) => void changeNetwork(event.target.value as NetworkProfileName)}
            >
              {NETWORK_PROFILES.map((profile) => (
                <option key={profile} value={profile}>
                  {NETWORK_LABELS[profile]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-caption text-muted">
              {nftId ? 'NFT aberto nesta página:' : 'Abra um NFT para mudar preço ou estoque.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!nftId || busy}
                onClick={() => nftId && void changePrice(nftId)}
              >
                Alterar preço
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!nftId || busy}
                onClick={() => nftId && void soldOut(nftId)}
              >
                Esgotar edição
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void dropSocket()}>
              Derrubar socket
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!state || busy}
              onClick={() => state && void resetTo(state.scenario)}
            >
              Resetar dados
            </Button>
          </div>
        </section>
      ) : null}

      <Button
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="bg-surface shadow-lg"
        onClick={() => {
          refresh();
          setOpen((value) => !value);
        }}
      >
        <FlaskConical aria-hidden="true" />
        Cenários
      </Button>
    </div>
  );
}
