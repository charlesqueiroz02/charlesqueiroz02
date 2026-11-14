/**
 * Hash de senha com PBKDF2 (WebCrypto, nativo do navegador — sem dependências).
 * Formato salvo: pbkdf2$<iterações>$<sal base64>$<hash base64>
 *
 * Importante: a conta do Valorize fica só neste aparelho (localStorage). O hash evita que
 * a senha fique legível no armazenamento, mas não substitui um login real com servidor.
 */
const ITERATIONS = 120_000;
const PREFIX = 'pbkdf2';

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
}

export const isHashed = (stored?: string) => !!stored && stored.startsWith(`${PREFIX}$`);

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derive(password, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${toB64(salt)}$${toB64(bits)}`;
}

/** Compara em tempo constante. Aceita o formato antigo (texto puro) para migração. */
export async function verifyPassword(password: string, stored?: string): Promise<boolean> {
  if (!stored || !password) return false;
  if (!isHashed(stored)) return stored === password; // contas antigas: migradas no primeiro login
  const [, iter, saltB64, hashB64] = stored.split('$');
  const bits = new Uint8Array(await derive(password, fromB64(saltB64), Number(iter)));
  const expected = fromB64(hashB64);
  if (bits.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
  return diff === 0;
}
