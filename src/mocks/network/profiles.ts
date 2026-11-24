/** Perfis de rede simulada (comportamento em `with-network.ts`). */
export const NETWORK_PROFILES = ['normal', 'slow', 'jitter', 'offline', 'flaky', 'timeout-orders'] as const;
export type NetworkProfileName = (typeof NETWORK_PROFILES)[number];

export function isNetworkProfile(value: unknown): value is NetworkProfileName {
  return typeof value === 'string' && (NETWORK_PROFILES as readonly string[]).includes(value);
}
