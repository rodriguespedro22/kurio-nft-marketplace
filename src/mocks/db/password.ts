// Senhas do banco mock: PBKDF2-SHA256 via WebCrypto, 100 000 iterações, salt de 16 bytes.
// Formato: `pbkdf2-sha256$<iterações>$<salt base64>$<hash base64>`. Nunca guardamos senha em claro.

const ALGORITHM = 'pbkdf2-sha256';
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(
  password: string,
  salt: Uint8Array<ArrayBuffer> = crypto.getRandomValues(new Uint8Array(SALT_BYTES)),
): Promise<string> {
  const hash = await derive(password, salt, ITERATIONS);
  return [ALGORITHM, String(ITERATIONS), toBase64(salt), toBase64(hash)].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterations, salt, expected] = stored.split('$');
  if (algorithm !== ALGORITHM || !iterations || !salt || !expected) return false;

  try {
    const actual = await derive(password, fromBase64(salt), Number(iterations));
    const target = fromBase64(expected);
    if (actual.length !== target.length) return false;
    // Comparação em tempo constante.
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= (actual[i] ?? 0) ^ (target[i] ?? 0);
    return diff === 0;
  } catch {
    return false;
  }
}
