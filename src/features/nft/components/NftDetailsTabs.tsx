import type { Nft } from '@/contracts';
import { NETWORK_LABELS } from '@/contracts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

const shortAddress = (address: string) =>
  address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;

/** "Detalhes do NFT" | "Avaliações de colecionadores (n)" — cada seção com o conteúdo certo. */
export function NftDetailsTabs({ nft }: { nft: Nft }) {
  const network = NETWORK_LABELS[nft.network];
  return (
    <Tabs defaultValue="detalhes">
      <TabsList aria-label="Informações do NFT">
        <TabsTrigger value="detalhes">Detalhes do NFT</TabsTrigger>
        <TabsTrigger value="avaliacoes">Avaliações de colecionadores ({nft.rating.count})</TabsTrigger>
      </TabsList>
      <TabsContent value="detalhes" className="flex flex-col gap-3 text-body-sm leading-6 text-secondary">
        <div className="flex flex-col gap-6">
          {nft.description.split('\n\n').map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="font-bold text-foreground">Rede:</dt>
            <dd>Cunhado na {network} com procedência imutável e metadados armazenados no IPFS.</dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Contrato:</dt>
            <dd>
              <span title={nft.contractAddress}>{shortAddress(nft.contractAddress)}</span> · Contrato
              inteligente verificado na {network}.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Direitos autorais:</dt>
            <dd>{nft.rights}</dd>
          </div>
        </dl>
      </TabsContent>
      <TabsContent value="avaliacoes" className="flex flex-col gap-3 text-body-sm leading-6 text-secondary">
        <p>
          Nota média <strong className="text-foreground">{nft.rating.average.toFixed(1)} de 5</strong>, com
          base em {nft.rating.count} {nft.rating.count === 1 ? 'avaliação' : 'avaliações'} de colecionadores.
        </p>
        <p>Os comentários das avaliações chegam em breve nesta demonstração.</p>
      </TabsContent>
    </Tabs>
  );
}
