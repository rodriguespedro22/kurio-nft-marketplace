/** `0x1a1a…1a1a` — início e fim do endereço, para caber em status e resumos. */
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}
