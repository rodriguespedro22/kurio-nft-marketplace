const ENS_SUFFIX = /\.eth$/i;

/** O campo "Nome ENS" mostra só o nome; o sufixo `.eth` fica fixo ao lado. */
export const ensLabel = (ensName: string) => ensName.replace(ENS_SUFFIX, '');

/** Nome digitado → nome ENS completo (`colecionador` → `colecionador.eth`); vazio continua vazio. */
export function ensFromLabel(label: string): string {
  const name = label.replace(ENS_SUFFIX, '');
  return name ? `${name}.eth` : '';
}
