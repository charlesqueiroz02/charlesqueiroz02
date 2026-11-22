// Hash de senha com PBKDF2 (WebCrypto). No modo com backend, a senha é tratada
// pelo Supabase Auth e nunca é armazenada pelo app.
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

export function newSalt() {
  const s = new Uint8Array(16);
  crypto.getRandomValues(s);
  return hex(s.buffer);
}

export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 120_000, hash: 'SHA-256' },
    key,
    256,
  );
  return hex(bits);
}

export function passwordProblems(p: string): string | null {
  if (p.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Use letras e números na senha.';
  return null;
}
